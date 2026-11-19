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

| Member | Java work | Frontend work |
| --- | --- | --- |
| **Pankaj Kumar** | Own [Main.java](src/reviewx/Main.java) and [Reviewer.java](src/reviewx/Reviewer.java). Read the uploaded bytes, check the size and contents, convert them to text, and send the review or error back. Explain the interface and why Main calls it. | Own the [upload form](frontend/components/review-workspace.tsx) and the [Next.js route that starts Java](frontend/app/api/review/route.ts). |
| **Shivam** | Own [GroqReviewer.java](src/reviewx/GroqReviewer.java) and the [Groq request template](groq-request.json). Build the request, call Groq, read the review from its JSON reply, and handle failed or incomplete responses. Explain the constructor and private API key field. | Own the [results panel](frontend/components/review-result.tsx), including the numbered review points and copyable code. |

### Java viva walkthrough

1. **Pankaj** starts with `Main.java` and traces a sample upload through `System.in`, the UTF-8 conversion, and the call to `Reviewer.review()`. An empty file demonstrates exception handling.
2. **Shivam** follows `GroqReviewer.review()` through the HTTP request, response checks, and extraction of the review JSON. The page then shows the summary, points, and cleaned-up code.

Use the [Java Backend Guide](docs/ReviewX-Java-Backend-Guide.docx) for the complete line-by-line walkthrough, the reading order, and the syllabus concepts used in the project.
