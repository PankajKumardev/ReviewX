# ReviewX viva preparation

This note explains the Java program in simple English. It is written for a first-semester MCA student.

The website is only the screen. The review decisions are made in Java.

---

## A. Project explanation

### What is ReviewX?

ReviewX is a website that reviews source code. The user can review one file or the source files inside a selected project folder. Java looks for four simple problems. The user can also ask Groq, an online AI service, for extra suggestions.

### What problem does it solve?

Reading a whole project by hand takes time. Small problems are easy to miss, such as a password written in the file, a forgotten `System.out.println`, or a `TODO` comment. ReviewX points at those lines and explains them in plain language.

It does not prove that the program is correct. It only reports what its checks can see.

### How does file review work?

1. The user clicks **Choose File**.
2. The browser opens the normal file picker.
3. The browser reads the file text with `file.text()`.
4. The browser sends JSON to the Java server.
5. Java checks the text and sends findings back.
6. The page shows each finding.

Java does not open the file from the computer's disk during a normal review. The browser already read it.

### How does folder review work?

1. The user clicks **Choose Folder**.
2. The browser uses `<input type="file" webkitdirectory multiple>`.
3. Each selected file has `webkitRelativePath`, such as `demo/src/Main.java`.
4. The browser skips `node_modules`, `.git`, build folders, `.env` files, images, and other unsupported files.
5. It sends at most 20 supported source files to Java.
6. Java checks the same limits again, then reviews the text.

Java never receives a folder path like `/Users/name/project`. It cannot wander around the disk.

### What are the local code checks?

`LocalReviewer` reads the code as text. It does not compile it.

- A quoted assignment to a name such as `password` or `token` may be a hardcoded credential.
- `System.out.println`, `console.log`, `print`, or `printf` may be debug output, depending on the language.
- `TODO` and `FIXME` in comments are unfinished notes.
- `eval(` in JavaScript and `exec(` in Python may run code dynamically.

### How is Groq integrated?

Groq is called only when the user turns on **Include AI Review**. Java uses `HttpClient` to POST to Groq's chat completions URL. The API key stays in the Java process. Java checks the AI reply before showing it. If Groq fails, the local findings are still shown.

### How are findings displayed?

The page shows how many files were reviewed and how many issues are high, medium, and low. Each issue is a card with the severity, category, file, line, message, explanation, suggested fix, and whether local Java or Groq reported it. Security lines are not printed on the card, so a secret is not shown again.

---

## B. Java OOP concepts, with ReviewX examples

### Class

A class is a blueprint. `SourceFile` is the blueprint for one selected file. The file itself is not the class. The class describes what a source file object contains.

### Object

An object is one real item made from a class.

```java
SourceFile file = new SourceFile("src/Main.java", "public class Main { }");
```

`file` is an object. It has its own path and its own content.

### Constructor

A constructor runs when `new` creates an object. It has the same name as the class and no return type.

```java
public SourceFile(String path, String content) {
    this.path = path;
    this.content = content;
}
```

`this.path` means the field of this object. `path` means the argument.

### Encapsulation

Encapsulation means the data is private and other classes use methods to reach it. `Finding` does not let outsiders write `finding.line = -1` directly, because `line` is private. They can read it with `getLine()`.

### Interface

An interface is a contract. It lists methods that a class must have. `Reviewer` has one method:

```java
List<Finding> review(List<SourceFile> files);
```

`LocalReviewer` and `GroqReviewer` both promise to provide that method.

### Polymorphism

Polymorphism means one call can run different code, depending on the real object.

```java
Reviewer localReviewer = new LocalReviewer();
List<Finding> localFindings = localReviewer.review(accepted);
```

The variable type is `Reviewer`. The object type is `LocalReviewer`. The same call shape is used for Groq:

```java
Reviewer aiReviewer = new GroqReviewer(apiKey.trim(), model);
aiFindings = aiReviewer.review(chooseAiFiles(accepted, localFindings));
```

`Main` does not need a different method name for each reviewer.

### Method

A method is a function inside a class. `reviewFile` is a method of `LocalReviewer`. It looks at one file and adds findings to a list.

### ArrayList

`ArrayList` is a resizable list. We do not have to know the final number of findings when we create it.

```java
List<Finding> findings = new ArrayList<Finding>();
findings.add(new Finding(...));
```

### List

`List` is the interface. `ArrayList` is one class that implements it. The method returns `List<Finding>`, so the caller can loop through the findings without caring that the concrete class is `ArrayList`.

### Exception handling

An exception is Java's way of reporting that something failed. We wrap risky work in `try` and handle it in `catch`.

Examples in this project:

- bad JSON
- a request that is too large
- `Files.readString()` if the sample file is missing
- Groq network and HTTP errors

### File handling

During a web review, the browser reads the user's files. Java receives the text inside JSON.

For the lab demonstration of Java file reading, the test runner does this:

```java
String issues = Files.readString(issuesPath);
```

That string is passed to the same `LocalReviewer` used by the website. There is no second review engine.

### String manipulation

The rules use normal `String` methods:

- `trim()` removes spaces at the ends
- `split("\n", -1)` breaks the file into lines
- `contains("\"")` looks for a quote
- `substring` takes the text after `=`
- `length()` is used while searching for a word
- `toLowerCase(Locale.ROOT)` makes the search ignore capital letters in a stable way

### HttpServer

`HttpServer` is built into Java. It listens for HTTP requests. We bind it to `127.0.0.1` and port `8080`, so only this computer can connect.

### HttpClient

`HttpClient` is also built into Java. `GroqReviewer` uses it to send one POST request to Groq and read the response body.

### JSON parsing

JSON is text that stores data in a structured way. The browser sends a JSON object with a `files` array. Gson turns that text into Java objects such as `JsonObject` and `JsonArray`. Gson also turns `Finding` objects back into JSON for the response.

### Concepts we did not use

We did not use a parent class and subclasses, an abstract class, a factory, a builder, or our own reflection. Please do not say those are part of the implementation. Interface implementation is the polymorphism in this project.

---

## C. Every Java file

### Main.java

1. **What it does:** Starts the program, listens for HTTP requests, checks the JSON, calls the reviewers, and sends the result.
2. **Why it is required:** A Java program needs `main` to start, and the website needs an HTTP server.
3. **Main methods:**
   - `main` starts the server, or runs tests when the argument is `test`
   - `startServer` and `openServer` create the server
   - `handleHealth` answers `GET /api/health`
   - `handleReview` answers `POST /api/review`
   - `reviewRequest` does the real review work
   - `chooseAiFiles` picks at most three files for Groq
   - `runTests` and the methods below it are the test runner
4. **OOP ideas:** It creates objects, uses the `Reviewer` interface, stores results in `ArrayList`, and uses `try-catch`.
5. **Connections:** It creates `SourceFile`, `LocalReviewer`, and `GroqReviewer` objects. It returns `Finding` data as JSON.

The bottom of the file is only for testing. You can explain the server without memorizing every test.

### SourceFile.java

1. **What it does:** Holds the path and the text of one selected file.
2. **Why it is required:** The reviewers need a simple object instead of two loose strings.
3. **Main methods:** the constructor, `getPath`, and `getContent`.
4. **OOP ideas:** class, object, constructor, encapsulation.
5. **Connections:** `Main` creates it. Both reviewers read it. `GroqReviewer` compares AI file names with `getPath()`.

### Finding.java

1. **What it does:** Holds one issue: file, line, severity, category, message, explanation, suggestion, and source.
2. **Why it is required:** Local checks and Groq checks must return the same kind of result.
3. **Main methods:** the constructor and the getters.
4. **OOP ideas:** class, encapsulation. Gson reads the private fields when it builds JSON.
5. **Connections:** Both reviewers create `Finding` objects. `Main` puts them in one list and sends them to the page.

### Reviewer.java

1. **What it does:** Declares `review(List<SourceFile> files)`.
2. **Why it is required:** It lets `Main` treat local review and AI review in the same way.
3. **Main methods:** only `review`.
4. **OOP ideas:** interface and polymorphism.
5. **Connections:** `LocalReviewer` and `GroqReviewer` implement it. `Main` calls it.

### LocalReviewer.java

1. **What it does:** Runs the four text checks.
2. **Why it is required:** This is the part that actually decides the local issues. The website does not make those decisions.
3. **Main methods:**
   - `review` loops through files
   - `reviewFile` loops through lines
   - `lineLooksLikeCredential` and `shouldHideLine`
   - `lineLooksLikeDebug`
   - `lineHasTodo`
   - `lineLooksLikeDynamicExecution`
4. **OOP ideas:** class, interface implementation, private helper methods, `ArrayList`.
5. **Connections:** Implements `Reviewer`. Creates `Finding`. `GroqReviewer` calls `shouldHideLine` so secrets are not sent to Groq.

### GroqReviewer.java

1. **What it does:** Builds a short prompt, calls Groq, and keeps only valid findings.
2. **Why it is required:** The optional AI review must happen in Java, and the AI reply must not be trusted blindly.
3. **Main methods:**
   - `review` calls Groq
   - `buildPrompt` numbers lines and redacts secrets
   - `callGroq` sends the HTTP request
   - `readFindings` and `toFinding` validate the reply
4. **OOP ideas:** class, constructor, interface implementation, exception handling.
5. **Connections:** Implements `Reviewer`. Uses `SourceFile`, creates `Finding`, and reuses `LocalReviewer.shouldHideLine`.

There is also a small private class `Reply` inside `Main`. It stores an HTTP status code and a response body. It is not a separate file.

---

## D. Important code, explained line by line

### The main method

```java
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
```

- `public` means other code can call it. Java itself calls `main`.
- `static` means it belongs to the class, not to one object. The program can start before any object exists.
- `String[] args` holds command-line words. `./run.sh test` puts `"test"` in `args[0]`.
- If the first word is `test`, we run the test methods and stop. `return` skips the server.
- `System.exit(1)` tells the terminal that the tests failed.
- Otherwise we start the server on port 8080.
- If the port is busy, `startServer` throws `IOException` and the `catch` prints a clear message.

### Starting HttpServer

```java
static HttpServer openServer(int port) throws IOException {
    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
    server.createContext("/api/health", exchange -> handleHealth(exchange));
    server.createContext("/api/review", exchange -> handleReview(exchange));
    server.setExecutor(null);
    server.start();
    return server;
}
```

- `InetSocketAddress("127.0.0.1", port)` means localhost only.
- The `0` is the connection backlog. Java chooses the default.
- `createContext` connects a URL to a method.
- `exchange -> handleHealth(exchange)` is a short function. When a request arrives, Java calls `handleHealth`.
- `setExecutor(null)` means we do not create a thread pool. The review work stays simple and synchronous.
- `start` begins listening.
- After `start`, `main` calls `Thread.currentThread().join()` so the program keeps running. The listener lives on a background thread created by `HttpServer`. Our review code does not start extra threads.

### The Reviewer interface

```java
public interface Reviewer {
    List<Finding> review(List<SourceFile> files);
}
```

- `interface` means this file does not contain the working code.
- Any class that says `implements Reviewer` must write `review`.
- The input is a list of source files.
- The output is a list of findings.
- There is no method body here.

### Local review and line numbers

```java
public List<Finding> review(List<SourceFile> files) {
    List<Finding> findings = new ArrayList<Finding>();
    for (int fileIndex = 0; fileIndex < files.size(); fileIndex++) {
        reviewFile(files.get(fileIndex), findings);
    }
    return findings;
}
```

- Create an empty list.
- `fileIndex` starts at 0. The loop continues while it is less than the number of files.
- `files.get(fileIndex)` is one `SourceFile`.
- The same `findings` list is passed into `reviewFile`, so every file adds to one list.
- The list is returned to `Main`.

```java
String[] lines = file.getContent().split("\n", -1);
for (int index = 0; index < lines.length; index++) {
    int lineNumber = index + 1;
    String line = lines[index];
```

- `split("\n", -1)` divides the text at each newline. The `-1` keeps an empty last line if the file ends with a newline.
- Arrays start at 0, but editors start at line 1. That is why we add 1.
- We do not guess the line. It is the loop position.

### Creating a Finding

```java
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
```

- The `if` asks a yes or no question about this line.
- `new Finding(...)` creates one issue object.
- The arguments follow the constructor order: file, line, severity, category, message, explanation, suggestion, source.
- The message is a fixed sentence. The password text is not copied into the object.
- `findings.add` stores the object in the `ArrayList`.
- `"LOCAL"` tells the page that Java's own rule found it, not Groq.

The other three rules use the same pattern with different severity, category, and text.

### ArrayList in the response

```java
List<Finding> all = new ArrayList<Finding>();
for (int i = 0; i < localFindings.size(); i++) {
    all.add(localFindings.get(i));
}
for (int i = 0; i < aiFindings.size(); i++) {
    all.add(aiFindings.get(i));
}
```

- `all` will hold both kinds of findings.
- The first loop copies local findings.
- The second loop copies AI findings after them.
- `size()` is the current number of items. `get(i)` reads one item.
- Local issues stay in the list even when the AI list is empty.

### Reading the HTTP request

```java
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
```

- `HttpExchange` is one request and its response.
- Review only accepts POST. Anything else gets status 405.
- `return` stops the method so we do not continue by accident.
- `readBody` copies the request bytes into a `String`.
- If the body is bigger than 700 KB, `readBody` throws `IOException` with the message `TOO_LARGE`.
- Status 413 means the request is too large.
- A normal read problem gets status 400.

`readBody` uses a `while` loop and a 4096-byte array. It adds each chunk to a `ByteArrayOutputStream` and stops early if the total is too big.

### Invalid JSON

```java
JsonElement parsed;
try {
    parsed = JsonParser.parseString(body);
} catch (RuntimeException ex) {
    return new Reply(400, errorJson("Invalid JSON."));
}
```

- `JsonParser.parseString` is Gson.
- If the text is not JSON, Gson throws a runtime exception.
- We catch it and return HTTP 400.
- The server does not crash.

### Polymorphism at the call site

```java
Reviewer localReviewer = new LocalReviewer();
List<Finding> localFindings = localReviewer.review(accepted);
```

and, only when AI is requested and the key exists:

```java
try {
    Reviewer aiReviewer = new GroqReviewer(apiKey.trim(), model);
    aiFindings = aiReviewer.review(chooseAiFiles(accepted, localFindings));
    aiStatus = "completed";
    aiMessage = "AI review completed. These findings are suggestions, not guaranteed bugs.";
} catch (RuntimeException ex) {
    aiStatus = "failed";
    aiMessage = "Local review completed. AI review unavailable.";
}
```

- Both variables have the type `Reviewer`.
- `new` chooses the real class.
- `chooseAiFiles` keeps at most 3 files and prefers files that already have local findings.
- If Groq throws, the `catch` runs. `localFindings` is already filled, so those issues are not lost.
- We do not put a fake AI finding in the list.

### The Groq request

```java
HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15))
        .build();

HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(API_URL))
        .timeout(Duration.ofSeconds(40))
        .header("Authorization", "Bearer " + apiKey)
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
        .build();
```

- `HttpClient` is the object that can send a request.
- The connect timeout is 15 seconds. The whole request may take up to 40 seconds.
- `API_URL` is `https://api.groq.com/openai/v1/chat/completions`.
- The key is sent only in the `Authorization` header, from the Java process to Groq.
- `POST` means we are sending data, not just reading a page.
- `body.toString()` is the JSON that Gson built. It includes the model name, the system instruction, the numbered source excerpt, and `"response_format": {"type": "json_object"}`.

```java
try {
    response = client.send(request, HttpResponse.BodyHandlers.ofString());
} catch (InterruptedException ex) {
    Thread.currentThread().interrupt();
    throw new IOException("The Groq request was interrupted.");
}

if (response.statusCode() < 200 || response.statusCode() >= 300) {
    throw new IOException("Groq returned HTTP " + response.statusCode() + ".");
}
```

- `send` waits until Groq answers. This is the synchronous style used in the project.
- `InterruptedException` is a checked exception. We turn it into `IOException` so `review` can report one kind of failure.
- Status codes from 200 to 299 mean success. 401 means the key was rejected. Any failure throws, and `Main` shows the unavailable message.

Before this request, `buildPrompt` writes lines as `24| code here`. If `LocalReviewer.shouldHideLine` is true, that line becomes `[redacted possible credential]`.

### try-catch around file reading in the test

```java
String issues = Files.readString(issuesPath);
String good = Files.readString(goodPath);
```

- `Files.readString` reads a whole text file into one `String`.
- The test uses `test-files/IssuesExample.java` and `test-files/GoodExample.java`.
- Those strings are wrapped in `SourceFile` objects and passed to `new LocalReviewer().review(...)`.
- This is the Java file-handling example. The website path is different: the browser reads the user's selection.

---

## E. Likely viva questions

1. **What is OOP?**
   Object-oriented programming organizes a program into objects. Each object has data and methods. In ReviewX, a source file and a finding are objects.

2. **What is a class?**
   A class is the blueprint. `Finding` describes every review issue. It is not one specific issue by itself.

3. **What is an object?**
   An object is one value created with `new`. `new LocalReviewer()` creates one reviewer object.

4. **What is encapsulation?**
   It means keeping fields private and providing methods to use them. `SourceFile` uses `getPath()` and `getContent()` instead of public fields.

5. **What is polymorphism?**
   One method call can run different code. `reviewer.review(files)` runs local checks or Groq checks depending on the object stored in the `Reviewer` variable.

6. **What is an interface?**
   An interface is a list of methods without the working code. `Reviewer` only declares `review`.

7. **Why did you use an interface?**
   So `Main` can call local review and AI review in the same way. Adding the call is just another class that implements `Reviewer`.

8. **What is the difference between an interface and a class?**
   A class can store fields and working methods. An interface in this project only declares the method that implementing classes must write. `Reviewer` cannot be created with `new Reviewer()`.

9. **What is a constructor?**
   It runs when an object is created and fills the private fields. `new Finding(...)` calls the `Finding` constructor.

10. **Why are fields private?**
    So other classes cannot change them in an unsafe way. For example, outside code cannot replace a finding's severity with a random word after the object is created.

11. **What is ArrayList?**
    It is a list that can grow. We use it because we do not know how many findings a file will have.

12. **What is the difference between an array and ArrayList?**
    An array has a fixed length, such as `String[] lines`. An `ArrayList` can `add` more items later. We use an array for the lines of one file and an `ArrayList` for findings.

13. **What is exception handling?**
    It is how Java reports and handles failures. `try` marks the risky code. `catch` decides what to do if it fails.

14. **What is a checked exception?**
    A checked exception must be caught or declared with `throws`. `IOException` is checked. `Files.readString` and `HttpClient.send` can throw checked exceptions. `RuntimeException` is unchecked. Bad JSON from Gson is handled as a runtime exception.

15. **What is the use of try-catch?**
    It stops one failure from ending the whole server. If Groq fails, the `catch` in `reviewRequest` sets the AI status to failed and still returns the local findings.

16. **How does Java read data in this project?**
    For a user's review, Java reads the HTTP body and parses JSON. It does not open the user's project folder. In the test runner, `Files.readString()` reads the sample files from `test-files`.

17. **What is HttpServer?**
    It is Java's built-in class for receiving HTTP requests. ReviewX uses it for `/api/health` and `/api/review` on `127.0.0.1:8080`.

18. **What is HttpClient?**
    It is Java's built-in class for sending HTTP requests. `GroqReviewer` uses it to call Groq.

19. **What is an API?**
    An API is a defined way for two programs to talk. Our API is the two HTTP endpoints. Groq's API is the chat completions URL.

20. **What is JSON?**
    JSON is a text format for structured data. A review request is an object with a `files` array and a `useAI` value. The response is an object with counts and a `findings` array.

21. **What is Gson?**
    Gson is the one external Java library in the project. It parses incoming JSON and writes outgoing JSON. We download `gson-2.15.0.jar` from Maven Central. The rest of the build does not use Maven.

22. **What is method overriding?**
    Overriding means a child class writes a new version of a method it inherited from a parent class. ReviewX does not use a parent class. The related idea we did use is interface implementation: both reviewers write their own `review` method and mark it with `@Override`.

23. **How is polymorphism used in ReviewX?**
    `Main` stores a `LocalReviewer` or a `GroqReviewer` in a `Reviewer` variable and calls `review`. The variable type is the same. The object type decides which code runs.

24. **What happens when Groq is unavailable?**
    The local review still finishes. The response has `aiStatus` set to `failed`, `aiIssueCount` set to 0, and the message `Local review completed. AI review unavailable.` No AI findings are invented.

25. **How are file paths and line numbers determined?**
    The browser sends the path, including `webkitRelativePath` for a folder. Java uses that string as the file name and does not read that path from disk. The line number is the index of the line in `split("\n")`, plus one.

26. **Why is the server bound to 127.0.0.1?**
    So other computers on the network cannot connect to it. The Next.js page on this computer forwards `/api` to that local port.

27. **Why is there no database?**
    The lab version does not store users, history, or past reviews. Each request is reviewed and forgotten.

28. **What does the source field mean?**
    `LOCAL` means `LocalReviewer` created the finding. `AI` means Java accepted a Groq suggestion. Java sets `AI` itself. If the model says `LOCAL`, we still store `AI`.

29. **Why can the rules be wrong?**
    They search text. They do not understand the program. A practice password in a demo can be flagged. A real bug with none of these patterns can be missed. The page says this clearly.

30. **What are the request limits?**
    20 files, 50 KB each, and 300 KB of source text. A raw body over 700 KB gets HTTP 413. Files inside `node_modules` and similar folders are skipped.

---

## F. Complete project workflow

1. The user opens `http://localhost:3000`.
2. The page calls `/api/health`. Next.js forwards it to Java. The header shows whether local review is ready.
3. The user selects a file or a folder.
4. The browser reads the file text and skips unsupported or ignored files.
5. The user may turn on **Include AI Review**. The page explains that excerpts go to Groq. The default is off.
6. The user clicks **Start Review**.
7. The browser sends `POST /api/review` with the file text and `useAI`.
8. Java validates the JSON, file types, and size limits.
9. `LocalReviewer` checks each accepted line.
10. If AI was requested, `GroqReviewer` sends a redacted excerpt and validates the reply.
11. Java returns one JSON response.
12. The page shows the counts, filters, and finding cards.
13. The code is not executed and no file is modified.

---

## G. What was simplified from the original synopsis

The final project includes only:

- single-file review
- project-folder review from the browser
- four basic local rules
- optional Groq review
- findings with severity, explanation, and a suggestion

These ideas from a larger synopsis are **not** implemented. Do not say that they are:

- Git review or diff review
- automatic code fixes
- review history
- dependency scanning
- downloadable reports
- project quality scores
- a multithreading analysis engine
- login and user accounts
- a database
- Maven, Gradle, or Spring Boot

The Java program is intentionally small so it can be explained in a viva.
