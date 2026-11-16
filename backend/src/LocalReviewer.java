import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Four beginner-friendly text checks.
 * These are hints. They are not a compiler, and they can flag safe code.
 */
public class LocalReviewer implements Reviewer {

    @Override
    public List<Finding> review(List<SourceFile> files) {
        List<Finding> findings = new ArrayList<Finding>();
        for (int fileIndex = 0; fileIndex < files.size(); fileIndex++) {
            reviewFile(files.get(fileIndex), findings);
        }
        return findings;
    }

    private void reviewFile(SourceFile file, List<Finding> findings) {
        String extension = extensionOf(file.getPath());
        String[] lines = file.getContent().split("\n", -1);

        for (int index = 0; index < lines.length; index++) {
            int lineNumber = index + 1;
            String line = lines[index];

            if (lineLooksLikeCredential(line)) {
                findings.add(new Finding(
                        file.getPath(),
                        lineNumber,
                        "HIGH",
                        "Security",
                        "Possible hardcoded credential detected.",
                        "A possible hardcoded credential was found.",
                        "Store sensitive credentials in environment variables.",
                        "LOCAL"));
            }

            if (lineLooksLikeDebug(line, extension)) {
                findings.add(new Finding(
                        file.getPath(),
                        lineNumber,
                        "LOW",
                        "Code Quality",
                        "Debug output was found.",
                        "Debug output was found in the source code.",
                        "Check whether this output is required.",
                        "LOCAL"));
            }

            if (lineHasTodo(line)) {
                findings.add(new Finding(
                        file.getPath(),
                        lineNumber,
                        "LOW",
                        "Maintainability",
                        "Unfinished task comment found.",
                        "An unfinished task or pending fix was found.",
                        "Review and complete the pending task if necessary.",
                        "LOCAL"));
            }

            if (lineLooksLikeDynamicExecution(line, extension)) {
                findings.add(new Finding(
                        file.getPath(),
                        lineNumber,
                        "MEDIUM",
                        "Security",
                        "Possible dynamic code execution detected.",
                        "Dynamic code execution should be reviewed carefully.",
                        "Avoid executing untrusted input.",
                        "LOCAL"));
            }
        }
    }

    /**
     * True when a line assigns a quoted value to a credential-like name.
     * GroqReviewer uses this too, so those lines are not sent to the API.
     */
    public static boolean lineLooksLikeCredential(String line) {
        String trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("/*")) {
            return false;
        }
        if (trimmed.startsWith("#") && !trimmed.toLowerCase(Locale.ROOT).startsWith("#define")) {
            return false;
        }
        if (!containsCredentialWord(line.toLowerCase(Locale.ROOT))) {
            return false;
        }
        return hasQuotedAssignment(line);
    }

    /** Hide a line from Groq when it may contain a secret, even if the rule is unsure. */
    public static boolean shouldHideLine(String line) {
        if (lineLooksLikeCredential(line)) {
            return true;
        }
        boolean quoted = line.contains("\"") || line.contains("'") || line.contains("`");
        return quoted && containsCredentialWord(line.toLowerCase(Locale.ROOT));
    }

    private static boolean containsCredentialWord(String lowerLine) {
        if (containsWholeWord(lowerLine, "password")) {
            return true;
        }
        if (containsWholeWord(lowerLine, "secret")) {
            return true;
        }
        if (containsWholeWord(lowerLine, "api_key")) {
            return true;
        }
        if (containsWholeWord(lowerLine, "apikey")) {
            return true;
        }
        if (containsWholeWord(lowerLine, "api-key")) {
            return true;
        }
        if (containsWholeWord(lowerLine, "token")) {
            return true;
        }
        return false;
    }

    private static boolean containsWholeWord(String text, String word) {
        return indexOfWholeWord(text, word) >= 0;
    }

    private static int indexOfWholeWord(String text, String word) {
        int from = 0;
        while (from < text.length()) {
            int at = text.indexOf(word, from);
            if (at < 0) {
                return -1;
            }
            boolean leftOk = at == 0 || !isLetterOrDigit(text.charAt(at - 1));
            int end = at + word.length();
            boolean rightOk = end >= text.length() || !isLetterOrDigit(text.charAt(end));
            if (leftOk && rightOk) {
                return at;
            }
            from = at + word.length();
        }
        return -1;
    }

    private static boolean isLetterOrDigit(char c) {
        return (c >= 'a' && c <= 'z')
                || (c >= 'A' && c <= 'Z')
                || (c >= '0' && c <= '9');
    }

    private static boolean hasQuotedAssignment(String line) {
        for (int i = 0; i < line.length(); i++) {
            if (line.charAt(i) != '=') {
                continue;
            }
            char before = i > 0 ? line.charAt(i - 1) : ' ';
            char after = i + 1 < line.length() ? line.charAt(i + 1) : ' ';
            if (before == '=' || before == '!' || before == '<' || before == '>') {
                continue;
            }
            if (after == '=') {
                continue;
            }
            String rest = line.substring(i + 1);
            if (rest.contains("\"") || rest.contains("'") || rest.contains("`")) {
                return true;
            }
        }
        return false;
    }

    private boolean lineLooksLikeDebug(String line, String extension) {
        if (isCommentLine(line, extension)) {
            return false;
        }
        if (extension.equals("java") && containsCall(line, "System.out.println")) {
            return true;
        }
        if (isJavaScript(extension) && containsCall(line, "console.log")) {
            return true;
        }
        if (extension.equals("py") && containsCall(line, "print")) {
            return true;
        }
        if ((extension.equals("c") || extension.equals("cpp")) && containsCall(line, "printf")) {
            return true;
        }
        return false;
    }

    private boolean lineLooksLikeDynamicExecution(String line, String extension) {
        if (isCommentLine(line, extension)) {
            return false;
        }
        if (isJavaScript(extension) && containsCall(line, "eval")) {
            return true;
        }
        if (extension.equals("py") && containsCall(line, "exec")) {
            return true;
        }
        return false;
    }

    private boolean isCommentLine(String line, String extension) {
        String trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("/*")) {
            return true;
        }
        return extension.equals("py") && trimmed.startsWith("#");
    }

    private boolean isJavaScript(String extension) {
        return extension.equals("js")
                || extension.equals("jsx")
                || extension.equals("ts")
                || extension.equals("tsx");
    }

    private boolean containsCall(String line, String name) {
        String call = name + "(";
        int from = 0;
        while (from < line.length()) {
            int at = line.indexOf(call, from);
            if (at < 0) {
                return false;
            }
            if (at == 0 || !isIdentChar(line.charAt(at - 1))) {
                return true;
            }
            from = at + 1;
        }
        return false;
    }

    private boolean isIdentChar(char c) {
        return isLetterOrDigit(c) || c == '_';
    }

    private boolean lineHasTodo(String line) {
        String upper = line.toUpperCase(Locale.ROOT);
        if (commentContainsWord(line, upper, "TODO")) {
            return true;
        }
        return commentContainsWord(line, upper, "FIXME");
    }

    private boolean commentContainsWord(String original, String upper, String word) {
        int at = indexOfWholeWord(upper, word);
        if (at < 0) {
            return false;
        }
        String trimmed = original.trim();
        if (trimmed.startsWith("//")
                || trimmed.startsWith("/*")
                || trimmed.startsWith("*")
                || trimmed.startsWith("#")) {
            return true;
        }
        String before = original.substring(0, at);
        return before.contains("//") || before.contains("/*") || before.contains("#");
    }

    static String extensionOf(String path) {
        String name = path;
        int slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
        if (slash >= 0) {
            name = path.substring(slash + 1);
        }
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) {
            return "";
        }
        return name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
