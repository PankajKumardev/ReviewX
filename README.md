# ReviewX

Upload one source or text file and get a short summary, four or five review points, and copyable code. Java reads the file text and calls Groq. The Next.js page shows the review.

## Run it

Use Java 21, Node.js 20.9 or newer, and a [Groq API key](https://console.groq.com/keys). In the project folder, run:

```sh
export GROQ_API_KEY='paste-your-key-here'
./run.sh
```

Open [ReviewX](http://127.0.0.1:3000) and try `test-files/GoodExample.java`. The script compiles Java, installs the frontend dependencies if needed, and starts the website. Use a UTF-8 file of 20 KB or less.

## Try the Java program directly

```sh
./run.sh --java < test-files/GoodExample.java
```

The `<` tells the terminal to give Java the file as input. You’ll see the same review as JSON.

## Where to start reading

1. **`Main.java`** reads the file from standard input, turns the bytes into a string, calls the reviewer, and prints the result.
2. **`Reviewer.java`** is an interface. Its one method says what a reviewer takes in and sends back.
3. **`GroqReviewer.java`** stores the key in its constructor, sends the instructions and file text to Groq, and reads the response. The prompt and the expected response fields live in `groq-request.json`.

The only library used by Java is Gson, which handles JSON. Next.js starts Java when a file arrives and reads the program’s output.

## Team responsibilities

See [ROLES.md](ROLES.md) for each member’s Java and frontend features.

Use the [Java Backend Guide](docs/ReviewX-Java-Backend-Guide.docx) for the complete line-by-line walkthrough, the reading order, and the syllabus concepts used in the project.
