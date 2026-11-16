import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Starts the ReviewX server and connects the two reviewers.
 */
public class Main {
    static final int MAX_FILES = 20;
    static final int MAX_FILE_BYTES = 50 * 1024;
    static final int MAX_TOTAL_BYTES = 300 * 1024;
    static final int MAX_BODY_BYTES = 700 * 1024;
    static final String DEFAULT_MODEL = "openai/gpt-oss-120b";

    private static final Gson GSON = new Gson();
    private static int testFailures = 0;

    public static void main(String[] args) throws Exception {
        if (args.length > 0 && args[0].equals("test")) {
            runTests();
            if (testFailures > 0) {
                System.exit(1);
            }
            return;
        }
        try {
            startServer(8080);
        } catch (IOException ex) {
            System.out.println("Could not start ReviewX on port 8080.");
            System.out.println("Another program may already be using that port.");
        }
    }

    static void startServer(int port) throws IOException {
        HttpServer server = openServer(port);
        System.out.println("ReviewX backend is running at http://127.0.0.1:" + port);
        System.out.println("Press Ctrl+C to stop.");
        try {
            Thread.currentThread().join();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            server.stop(0);
        }
    }

    static HttpServer openServer(int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api/health", exchange -> handleHealth(exchange));
        server.createContext("/api/review", exchange -> handleReview(exchange));
        server.setExecutor(null);
        server.start();
        return server;
    }

    static void handleHealth(HttpExchange exchange) throws IOException {
        if (!exchange.getRequestMethod().equals("GET")) {
            send(exchange, 405, errorJson("Use GET for /api/health."));
            return;
        }
        JsonObject json = new JsonObject();
        json.addProperty("status", "ok");
        String key = System.getenv("GROQ_API_KEY");
        json.addProperty("aiConfigured", key != null && !key.trim().isEmpty());
        send(exchange, 200, json.toString());
    }

    static void handleReview(HttpExchange exchange) throws IOException {
        if (!exchange.getRequestMethod().equals("POST")) {
            send(exchange, 405, errorJson("Use POST for /api/review."));
            return;
        }
        String body;
        try {
            body = readBody(exchange);
        } catch (IOException ex) {
            if ("TOO_LARGE".equals(ex.getMessage())) {
                send(exchange, 413, errorJson("The request is larger than 700 KB."));
                return;
            }
            send(exchange, 400, errorJson("The request body could not be read."));
            return;
        }
        try {
            Reply reply = reviewRequest(body, System.getenv("GROQ_API_KEY"), currentModel());
            send(exchange, reply.status, reply.body);
        } catch (RuntimeException ex) {
            send(exchange, 500, errorJson("The review could not be completed."));
        }
    }

    static String currentModel() {
        String model = System.getenv("GROQ_MODEL");
        if (model == null || model.trim().isEmpty()) {
            return DEFAULT_MODEL;
        }
        return model.trim();
    }

    static Reply reviewRequest(String body, String apiKey, String model) {
        JsonElement parsed;
        try {
            parsed = JsonParser.parseString(body);
        } catch (RuntimeException ex) {
            return new Reply(400, errorJson("Invalid JSON."));
        }
        if (!parsed.isJsonObject()) {
            return new Reply(400, errorJson("Invalid JSON."));
        }

        JsonObject root = parsed.getAsJsonObject();
        if (!root.has("files") || !root.get("files").isJsonArray()) {
            return new Reply(400, errorJson("Add a files array. Each item needs a path and content."));
        }

        boolean useAI = false;
        if (root.has("useAI") && !root.get("useAI").isJsonNull()) {
            JsonElement flag = root.get("useAI");
            if (!flag.isJsonPrimitive() || !flag.getAsJsonPrimitive().isBoolean()) {
                return new Reply(400, errorJson("useAI must be true or false."));
            }
            useAI = flag.getAsBoolean();
        }

        JsonArray inputFiles = root.getAsJsonArray("files");
        if (inputFiles.size() == 0) {
            return new Reply(400, errorJson("No files were provided."));
        }

        List<SourceFile> accepted = new ArrayList<SourceFile>();
        JsonArray skipped = new JsonArray();
        int totalBytes = 0;

        for (int i = 0; i < inputFiles.size(); i++) {
            if (!inputFiles.get(i).isJsonObject()) {
                addSkip(skipped, "file " + (i + 1), "File entry must be an object.");
                continue;
            }
            JsonObject item = inputFiles.get(i).getAsJsonObject();
            if (!item.has("path") || !item.has("content")
                    || item.get("path").isJsonNull() || item.get("content").isJsonNull()) {
                addSkip(skipped, "file " + (i + 1), "Missing path or content.");
                continue;
            }

            String path;
            String content;
            try {
                path = item.get("path").getAsString().trim();
                content = item.get("content").getAsString();
            } catch (RuntimeException ex) {
                addSkip(skipped, "file " + (i + 1), "Path and content must be text.");
                continue;
            }
            if (path.isEmpty()) {
                addSkip(skipped, "(blank path)", "The file path is empty.");
                continue;
            }

            content = content.replace("\r\n", "\n").replace('\r', '\n');
            if (isBlockedPath(path)) {
                addSkip(skipped, path, "This file or folder is ignored.");
                continue;
            }
            if (!isSupported(path)) {
                addSkip(skipped, path, "This file type is not supported.");
                continue;
            }

            int size = content.getBytes(StandardCharsets.UTF_8).length;
            if (size > MAX_FILE_BYTES) {
                addSkip(skipped, path, "File is larger than 50 KB.");
                continue;
            }
            if (accepted.size() >= MAX_FILES) {
                addSkip(skipped, path, "Only 20 source files can be reviewed at once.");
                continue;
            }
            if (totalBytes + size > MAX_TOTAL_BYTES) {
                addSkip(skipped, path, "Total source limit of 300 KB was reached.");
                continue;
            }

            accepted.add(new SourceFile(path, content));
            totalBytes = totalBytes + size;
        }

        Reviewer localReviewer = new LocalReviewer();
        List<Finding> localFindings = localReviewer.review(accepted);

        List<Finding> aiFindings = new ArrayList<Finding>();
        String aiStatus = "skipped";
        String aiMessage = "AI review was not requested.";

        if (useAI) {
            if (accepted.isEmpty()) {
                aiMessage = "AI review was skipped because no source file was accepted.";
            } else if (apiKey == null || apiKey.trim().isEmpty()) {
                aiStatus = "failed";
                aiMessage = "Local review completed. AI review unavailable.";
            } else {
                try {
                    Reviewer aiReviewer = new GroqReviewer(apiKey.trim(), model);
                    aiFindings = aiReviewer.review(chooseAiFiles(accepted, localFindings));
                    aiStatus = "completed";
                    aiMessage = "AI review completed. These findings are suggestions, not guaranteed bugs.";
                } catch (RuntimeException ex) {
                    aiStatus = "failed";
                    aiMessage = "Local review completed. AI review unavailable.";
                }
            }
        }

        List<Finding> all = new ArrayList<Finding>();
        for (int i = 0; i < localFindings.size(); i++) {
            all.add(localFindings.get(i));
        }
        for (int i = 0; i < aiFindings.size(); i++) {
            all.add(aiFindings.get(i));
        }

        JsonObject response = new JsonObject();
        response.addProperty("filesReviewed", accepted.size());
        response.addProperty("filesSkipped", skipped.size());
        response.addProperty("localIssueCount", localFindings.size());
        response.addProperty("aiIssueCount", aiFindings.size());
        response.addProperty("aiStatus", aiStatus);
        response.addProperty("aiMessage", aiMessage);
        response.add("skipped", skipped);
        response.add("findings", GSON.toJsonTree(all));
        return new Reply(200, response.toString());
    }

    static List<SourceFile> chooseAiFiles(List<SourceFile> files, List<Finding> localFindings) {
        List<SourceFile> chosen = new ArrayList<SourceFile>();
        for (int i = 0; i < files.size(); i++) {
            if (chosen.size() == 3) {
                break;
            }
            SourceFile file = files.get(i);
            if (hasLocalFinding(localFindings, file.getPath())) {
                chosen.add(file);
            }
        }
        for (int i = 0; i < files.size(); i++) {
            if (chosen.size() == 3) {
                break;
            }
            SourceFile file = files.get(i);
            if (!containsFile(chosen, file.getPath())) {
                chosen.add(file);
            }
        }
        return chosen;
    }

    private static boolean hasLocalFinding(List<Finding> findings, String path) {
        for (int i = 0; i < findings.size(); i++) {
            if (findings.get(i).getFile().equals(path)) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsFile(List<SourceFile> files, String path) {
        for (int i = 0; i < files.size(); i++) {
            if (files.get(i).getPath().equals(path)) {
                return true;
            }
        }
        return false;
    }

    static boolean isSupported(String path) {
        String extension = LocalReviewer.extensionOf(path);
        return extension.equals("java")
                || extension.equals("js")
                || extension.equals("jsx")
                || extension.equals("ts")
                || extension.equals("tsx")
                || extension.equals("py")
                || extension.equals("c")
                || extension.equals("cpp");
    }

    static boolean isBlockedPath(String path) {
        String[] parts = path.split("[/\\\\]");
        for (int i = 0; i < parts.length; i++) {
            String part = parts[i].toLowerCase(Locale.ROOT);
            if (part.equals("node_modules")
                    || part.equals(".git")
                    || part.equals(".next")
                    || part.equals("dist")
                    || part.equals("build")
                    || part.equals("target")
                    || part.equals("coverage")
                    || part.equals(".venv")
                    || part.equals("__pycache__")) {
                return true;
            }
            if (part.equals(".env") || part.endsWith(".env") || part.startsWith(".env.")) {
                return true;
            }
            if (part.endsWith(".pem") || part.endsWith(".key") || part.contains("id_rsa")) {
                return true;
            }
            if (part.equals("package-lock.json")
                    || part.equals("yarn.lock")
                    || part.equals("pnpm-lock.yaml")
                    || part.equals("bun.lock")) {
                return true;
            }
            if (part.endsWith(".class")
                    || part.endsWith(".jar")
                    || part.endsWith(".png")
                    || part.endsWith(".jpg")
                    || part.endsWith(".jpeg")
                    || part.endsWith(".gif")
                    || part.endsWith(".webp")
                    || part.endsWith(".mp4")
                    || part.endsWith(".mov")
                    || part.endsWith(".zip")) {
                return true;
            }
        }
        return false;
    }

    private static void addSkip(JsonArray skipped, String path, String reason) {
        JsonObject item = new JsonObject();
        item.addProperty("path", path);
        item.addProperty("reason", reason);
        skipped.add(item);
    }

    static String readBody(HttpExchange exchange) throws IOException {
        InputStream input = exchange.getRequestBody();
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[4096];
        int total = 0;
        int count;
        while ((count = input.read(chunk)) != -1) {
            total = total + count;
            if (total > MAX_BODY_BYTES) {
                throw new IOException("TOO_LARGE");
            }
            buffer.write(chunk, 0, count);
        }
        return buffer.toString(StandardCharsets.UTF_8);
    }

    static void send(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        OutputStream output = exchange.getResponseBody();
        output.write(bytes);
        output.close();
    }

    static String errorJson(String message) {
        JsonObject json = new JsonObject();
        json.addProperty("error", message);
        return json.toString();
    }

    private static class Reply {
        private final int status;
        private final String body;

        private Reply(int status, String body) {
            this.status = status;
            this.body = body;
        }
    }

    static void runTests() throws Exception {
        testJavaFileRules();
        testJavaScriptFile();
        testPythonFile();
        testCppDebug();
        testMultipleFiles();
        testFalsePositives();
        testEmptyAndUnsupported();
        testLimits();
        testInvalidJson();
        testNoApiKey();
        testAiValidation();
        testAiFileChoice();
        testSampleFilesFromDisk();
        testHttpServer();
        testAiFailureDoesNotHideLocalFindings();

        if (testFailures == 0) {
            System.out.println("All tests passed.");
        } else {
            System.out.println(testFailures + " test(s) failed.");
        }
    }

    private static void testJavaFileRules() {
        String code = "public class Demo {\n"
                + "    String password = \"zz-hidden-credential-42\";\n"
                + "    System.out.println(\"hi\");\n"
                + "    // TODO: finish demo\n"
                + "    // FIXME: check this line\n"
                + "}\n";
        JsonObject result = reviewOk(requestJson(false, new String[][]{{"src/Demo.java", code}}));
        JsonArray findings = result.getAsJsonArray("findings");

        JsonObject credential = findByMessage(findings, "Possible hardcoded credential detected.");
        JsonObject debug = findByMessage(findings, "Debug output was found.");
        JsonObject todo = findByMessage(findings, "Unfinished task comment found.");

        check(result.get("filesReviewed").getAsInt() == 1, "single Java file is reviewed");
        check(credential != null && credential.get("line").getAsInt() == 2, "credential line number is 2");
        check(credential != null && credential.get("file").getAsString().equals("src/Demo.java"), "credential keeps the file name");
        check(credential != null && credential.get("severity").getAsString().equals("HIGH"), "credential severity is HIGH");
        check(credential != null && credential.get("category").getAsString().equals("Security"), "credential category is Security");
        check(credential != null && credential.get("source").getAsString().equals("LOCAL"), "credential source is LOCAL");
        check(debug != null && debug.get("line").getAsInt() == 3, "debug line number is 3");
        check(todo != null && todo.get("line").getAsInt() == 4, "TODO line number is 4");
        check(countMessage(findings, "Unfinished task comment found.") == 2, "TODO and FIXME are both reported");
        check(!result.toString().contains("zz-hidden-credential-42"), "secret value is not included in findings");
    }

    private static void testJavaScriptFile() {
        String code = "const api_key = \"abc\";\n"
                + "console.log(\"debug\");\n"
                + "eval(\"1+1\");\n"
                + "const name = \"TODO later\";\n"
                + "// FIXME: cleanup\n";
        JsonObject result = reviewOk(requestJson(false, new String[][]{{"app.js", code}}));
        JsonArray findings = result.getAsJsonArray("findings");

        check(findByMessage(findings, "Possible hardcoded credential detected.") != null, "JavaScript credential is detected");
        check(lineOf(findings, "Debug output was found.") == 2, "console.log line number is 2");
        JsonObject dynamic = findByMessage(findings, "Possible dynamic code execution detected.");
        check(dynamic != null && dynamic.get("line").getAsInt() == 3, "eval line number is 3");
        check(dynamic != null && dynamic.get("severity").getAsString().equals("MEDIUM"), "eval severity is MEDIUM");
        check(lineOf(findings, "Unfinished task comment found.") == 5, "FIXME comment is detected");
        check(countMessage(findings, "Unfinished task comment found.") == 1, "TODO inside a string is ignored");
    }

    private static void testPythonFile() {
        String code = "token = \"abc\"\n"
                + "print(\"hi\")\n"
                + "exec(\"print(1)\")\n"
                + "# TODO: later\n";
        JsonObject result = reviewOk(requestJson(false, new String[][]{{"tool.py", code}}));
        JsonArray findings = result.getAsJsonArray("findings");
        check(lineOf(findings, "Possible hardcoded credential detected.") == 1, "Python credential line is 1");
        check(lineOf(findings, "Debug output was found.") == 2, "Python print line is 2");
        check(lineOf(findings, "Possible dynamic code execution detected.") == 3, "Python exec line is 3");
        check(lineOf(findings, "Unfinished task comment found.") == 4, "Python TODO line is 4");
    }

    private static void testCppDebug() {
        String code = "#include <stdio.h>\n"
                + "int main() {\n"
                + "    printf(\"debug\");\n"
                + "    return 0;\n"
                + "}\n";
        JsonObject result = reviewOk(requestJson(false, new String[][]{{"main.cpp", code}}));
        check(lineOf(result.getAsJsonArray("findings"), "Debug output was found.") == 3, "C++ printf line is 3");
    }

    private static void testMultipleFiles() {
        String javaCode = "class A {\n    System.out.println(\"a\");\n}\n";
        String jsCode = "console.log(\"b\");\n";
        JsonObject result = reviewOk(requestJson(false, new String[][]{
                {"src/A.java", javaCode},
                {"web/app.js", jsCode}
        }));
        check(result.get("filesReviewed").getAsInt() == 2, "two files are reviewed");
        JsonArray findings = result.getAsJsonArray("findings");
        check(countFile(findings, "src/A.java") == 1, "Java finding keeps its own file name");
        check(countFile(findings, "web/app.js") == 1, "JavaScript finding keeps its own file name");
    }

    private static void testFalsePositives() {
        String comparison = "if (password == \"admin\") {\n}\n";
        JsonObject compared = reviewOk(requestJson(false, new String[][]{{"Auth.java", comparison}}));
        check(countMessage(compared.getAsJsonArray("findings"), "Possible hardcoded credential detected.") == 0,
                "comparison with == is not treated as an assignment");

        String unread = "String password = readPassword();\n";
        JsonObject plain = reviewOk(requestJson(false, new String[][]{{"Auth.java", unread}}));
        check(plain.get("localIssueCount").getAsInt() == 0, "password without a quoted value is ignored");

        String javaEval = "String mode = \"eval(user)\";\nSystem.out.println(\"ok\");\n";
        JsonObject javaFile = reviewOk(requestJson(false, new String[][]{{"Demo.java", javaEval}}));
        check(countMessage(javaFile.getAsJsonArray("findings"), "Possible dynamic code execution detected.") == 0,
                "eval inside a Java file is not a JavaScript rule");

        String commented = "// System.out.println(\"hidden\");\nString name = \"ok\";\n";
        JsonObject comments = reviewOk(requestJson(false, new String[][]{{"Demo.java", commented}}));
        check(comments.get("localIssueCount").getAsInt() == 0, "commented debug output is ignored");
    }

    private static void testEmptyAndUnsupported() {
        JsonObject empty = reviewOk(requestJson(false, new String[][]{{"Empty.java", ""}}));
        check(empty.get("filesReviewed").getAsInt() == 1, "empty file is accepted");
        check(empty.get("localIssueCount").getAsInt() == 0, "empty file has no findings");

        JsonObject unsupported = reviewOk(requestJson(false, new String[][]{{"notes.txt", "hello"}}));
        check(unsupported.get("filesReviewed").getAsInt() == 0, "unsupported file is not reviewed");
        check(unsupported.get("filesSkipped").getAsInt() == 1, "unsupported file is counted as skipped");

        JsonObject blocked = reviewOk(requestJson(false, new String[][]{{"node_modules/Lib.java", "class Lib {}"}}));
        check(blocked.get("filesReviewed").getAsInt() == 0, "node_modules file is ignored");

        JsonObject env = reviewOk(requestJson(false, new String[][]{{".env", "TOKEN=abc"}}));
        check(env.get("filesReviewed").getAsInt() == 0, ".env file is ignored");

        Reply missing = reviewRequest("{}", "", DEFAULT_MODEL);
        check(missing.status == 400, "missing files array returns 400");
        Reply none = reviewRequest("{\"files\":[]}", "", DEFAULT_MODEL);
        check(none.status == 400, "empty files array returns 400");
    }

    private static void testLimits() {
        String big = repeatChar('a', MAX_FILE_BYTES + 1);
        JsonObject tooBig = reviewOk(requestJson(false, new String[][]{{"Big.java", big}}));
        check(tooBig.get("filesReviewed").getAsInt() == 0, "oversized file is not reviewed");
        check(tooBig.getAsJsonArray("skipped").get(0).getAsJsonObject().get("reason").getAsString()
                .contains("50 KB"), "oversized file explains the 50 KB limit");

        String medium = "class M {}\n" + repeatChar(' ', 40 * 1024);
        String[][] many = new String[8][2];
        for (int i = 0; i < many.length; i++) {
            many[i][0] = "File" + i + ".java";
            many[i][1] = medium;
        }
        JsonObject total = reviewOk(requestJson(false, many));
        check(total.get("filesReviewed").getAsInt() < 8, "total source limit skips extra files");
        check(total.get("filesReviewed").getAsInt() > 0, "files that fit are still reviewed");
        check(total.get("filesSkipped").getAsInt() > 0, "files past 300 KB are skipped");

        String[][] tooMany = new String[21][2];
        for (int i = 0; i < tooMany.length; i++) {
            tooMany[i][0] = "N" + i + ".java";
            tooMany[i][1] = "class N" + i + " {}";
        }
        JsonObject counted = reviewOk(requestJson(false, tooMany));
        check(counted.get("filesReviewed").getAsInt() == 20, "at most 20 files are reviewed");
        check(counted.get("filesSkipped").getAsInt() == 1, "file 21 is skipped");
    }

    private static void testInvalidJson() {
        Reply bad = reviewRequest("{", "", DEFAULT_MODEL);
        check(bad.status == 400, "invalid JSON returns 400");
        check(bad.body.contains("Invalid JSON"), "invalid JSON has a clear error");

        Reply badFlag = reviewRequest("{\"files\":[{\"path\":\"A.java\",\"content\":\"class A {}\"}],\"useAI\":\"yes\"}",
                "", DEFAULT_MODEL);
        check(badFlag.status == 400, "non-boolean useAI returns 400");
    }

    private static void testNoApiKey() {
        String code = "class A {\n    System.out.println(\"hi\");\n}\n";
        Reply reply = reviewRequest(requestJson(true, new String[][]{{"A.java", code}}), "  ", DEFAULT_MODEL);
        JsonObject result = JsonParser.parseString(reply.body).getAsJsonObject();
        check(reply.status == 200, "missing API key still returns local review");
        check(result.get("aiStatus").getAsString().equals("failed"), "missing API key sets AI status to failed");
        check(result.get("aiIssueCount").getAsInt() == 0, "missing API key does not invent AI findings");
        check(result.get("localIssueCount").getAsInt() == 1, "missing API key keeps the local finding");
        check(result.get("aiMessage").getAsString().equals("Local review completed. AI review unavailable."),
                "missing API key uses the unavailable message");
    }

    private static void testAiValidation() throws IOException {
        List<SourceFile> files = new ArrayList<SourceFile>();
        files.add(new SourceFile("src/Demo.java", "class Demo {\n    int value;\n}\n"));
        GroqReviewer reviewer = new GroqReviewer("test-key", DEFAULT_MODEL);

        String valid = "{"
                + "\"findings\":[{"
                + "\"file\":\"src/Demo.java\",\"line\":2,\"severity\":\"low\","
                + "\"category\":\"Maintainability\",\"message\":\"Name is unclear.\","
                + "\"explanation\":\"A clearer name would help.\",\"suggestion\":\"Rename value.\","
                + "\"source\":\"LOCAL\""
                + "},{"
                + "\"file\":\"missing.java\",\"line\":1,\"severity\":\"HIGH\","
                + "\"category\":\"Security\",\"message\":\"Nope.\","
                + "\"explanation\":\"Nope.\",\"suggestion\":\"Nope.\""
                + "},{"
                + "\"file\":\"src/Demo.java\",\"line\":99,\"severity\":\"HIGH\","
                + "\"category\":\"Security\",\"message\":\"Nope.\","
                + "\"explanation\":\"Nope.\",\"suggestion\":\"Nope.\""
                + "},{"
                + "\"file\":\"src/Demo.java\",\"line\":1,\"severity\":\"URGENT\","
                + "\"category\":\"Security\",\"message\":\"Nope.\","
                + "\"explanation\":\"Nope.\",\"suggestion\":\"Nope.\""
                + "}]"
                + "}";

        List<Finding> findings = reviewer.readFindings(valid, files);
        check(findings.size() == 1, "invalid AI findings are skipped");
        check(findings.get(0).getSource().equals("AI"), "AI source is set by Java, not by the model");
        check(findings.get(0).getSeverity().equals("LOW"), "lowercase severity is normalized");
        check(findings.get(0).getLine() == 2, "valid AI line number is kept");

        boolean rejected = false;
        try {
            reviewer.readFindings("this is not json", files);
        } catch (IOException ex) {
            rejected = true;
        }
        check(rejected, "invalid AI JSON is rejected");

        String fenced = "```json\n{\"findings\":[]}\n```";
        check(reviewer.readFindings(fenced, files).size() == 0, "fenced JSON with no findings is accepted");
    }

    private static void testAiFileChoice() {
        List<SourceFile> files = new ArrayList<SourceFile>();
        List<Finding> local = new ArrayList<Finding>();
        for (int i = 1; i <= 5; i++) {
            files.add(new SourceFile("F" + i + ".java", "class F" + i + " {}"));
        }
        local.add(new Finding("F4.java", 1, "LOW", "Code Quality", "Debug output was found.",
                "Debug output was found in the source code.", "Check whether this output is required.", "LOCAL"));
        List<SourceFile> chosen = chooseAiFiles(files, local);
        check(chosen.size() == 3, "AI context keeps at most 3 files");
        check(chosen.get(0).getPath().equals("F4.java"), "files with local findings are sent first");
    }

    private static void testSampleFilesFromDisk() throws IOException {
        Path issuesPath = samplePath("IssuesExample.java");
        Path goodPath = samplePath("GoodExample.java");
        String issues = Files.readString(issuesPath);
        String good = Files.readString(goodPath);

        List<SourceFile> issueFiles = new ArrayList<SourceFile>();
        issueFiles.add(new SourceFile("IssuesExample.java", issues.replace("\r\n", "\n")));
        List<Finding> issueFindings = new LocalReviewer().review(issueFiles);
        check(issueFindings.size() >= 3, "sample issue file produces local findings");

        List<SourceFile> goodFiles = new ArrayList<SourceFile>();
        goodFiles.add(new SourceFile("GoodExample.java", good.replace("\r\n", "\n")));
        check(new LocalReviewer().review(goodFiles).size() == 0, "clean sample file has no local findings");
    }

    private static void testHttpServer() throws Exception {
        HttpServer server = openServer(0);
        int port = server.getAddress().getPort();
        try {
            HttpResponse<String> health = httpSend(port, "GET", "/api/health", "");
            check(health.statusCode() == 200, "health endpoint returns 200");
            JsonObject healthJson = JsonParser.parseString(health.body()).getAsJsonObject();
            check(healthJson.get("status").getAsString().equals("ok"), "health status is ok");

            HttpResponse<String> wrongMethod = httpSend(port, "POST", "/api/health", "");
            check(wrongMethod.statusCode() == 405, "health rejects POST");

            String reviewBody = requestJson(false, new String[][]{{"Demo.java", "class Demo {\nSystem.out.println(\"x\");\n}\n"}});
            HttpResponse<String> review = httpSend(port, "POST", "/api/review", reviewBody);
            check(review.statusCode() == 200, "HTTP review returns 200");
            JsonObject reviewJson = JsonParser.parseString(review.body()).getAsJsonObject();
            check(reviewJson.get("localIssueCount").getAsInt() == 1, "HTTP review returns the local finding");

            HttpResponse<String> huge = httpSend(port, "POST", "/api/review", repeatChar('a', MAX_BODY_BYTES + 20));
            check(huge.statusCode() == 413, "oversized HTTP body returns 413");
        } finally {
            server.stop(0);
        }
    }

    private static void testAiFailureDoesNotHideLocalFindings() {
        String code = "class A {\n    System.out.println(\"hi\");\n}\n";
        Reply reply = reviewRequest(requestJson(true, new String[][]{{"A.java", code}}),
                "invalid-test-key", DEFAULT_MODEL);
        JsonObject result = JsonParser.parseString(reply.body).getAsJsonObject();
        check(reply.status == 200, "Groq failure still returns HTTP 200");
        check(result.get("localIssueCount").getAsInt() == 1, "Groq failure keeps local findings");
        check(result.get("aiStatus").getAsString().equals("failed"), "invalid Groq key sets AI status to failed");
        check(result.get("aiIssueCount").getAsInt() == 0, "Groq failure does not fabricate AI findings");
        check(result.get("aiMessage").getAsString().equals("Local review completed. AI review unavailable."),
                "Groq failure shows the unavailable message");
    }

    private static JsonObject reviewOk(String json) {
        Reply reply = reviewRequest(json, "", DEFAULT_MODEL);
        check(reply.status == 200, "review returns 200");
        return JsonParser.parseString(reply.body).getAsJsonObject();
    }

    private static String requestJson(boolean useAI, String[][] files) {
        JsonObject root = new JsonObject();
        root.addProperty("useAI", useAI);
        JsonArray array = new JsonArray();
        for (int i = 0; i < files.length; i++) {
            JsonObject file = new JsonObject();
            file.addProperty("path", files[i][0]);
            file.addProperty("content", files[i][1]);
            array.add(file);
        }
        root.add("files", array);
        return root.toString();
    }

    private static JsonObject findByMessage(JsonArray findings, String message) {
        for (int i = 0; i < findings.size(); i++) {
            JsonObject item = findings.get(i).getAsJsonObject();
            if (item.get("message").getAsString().equals(message)) {
                return item;
            }
        }
        return null;
    }

    private static int lineOf(JsonArray findings, String message) {
        JsonObject item = findByMessage(findings, message);
        if (item == null) {
            return -1;
        }
        return item.get("line").getAsInt();
    }

    private static int countMessage(JsonArray findings, String message) {
        int count = 0;
        for (int i = 0; i < findings.size(); i++) {
            if (findings.get(i).getAsJsonObject().get("message").getAsString().equals(message)) {
                count = count + 1;
            }
        }
        return count;
    }

    private static int countFile(JsonArray findings, String file) {
        int count = 0;
        for (int i = 0; i < findings.size(); i++) {
            if (findings.get(i).getAsJsonObject().get("file").getAsString().equals(file)) {
                count = count + 1;
            }
        }
        return count;
    }

    private static String repeatChar(char c, int count) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < count; i++) {
            builder.append(c);
        }
        return builder.toString();
    }

    private static Path samplePath(String name) {
        Path fromBackend = Path.of("..", "test-files", name);
        if (Files.exists(fromBackend)) {
            return fromBackend;
        }
        return Path.of("test-files", name);
    }

    private static HttpResponse<String> httpSend(int port, String method, String path, String body) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create("http://127.0.0.1:" + port + path));
        if (method.equals("GET")) {
            builder.GET();
        } else {
            builder.header("Content-Type", "application/json");
            builder.POST(HttpRequest.BodyPublishers.ofString(body));
        }
        return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static void check(boolean condition, String name) {
        if (condition) {
            System.out.println("PASS: " + name);
        } else {
            testFailures = testFailures + 1;
            System.out.println("FAIL: " + name);
        }
    }
}
