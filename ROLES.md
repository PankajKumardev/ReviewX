# ReviewX Team Responsibilities

| Member | Java work | Frontend work |
| --- | --- | --- |
| **Pankaj Kumar** | Own [Main.java](src/reviewx/Main.java) and [Reviewer.java](src/reviewx/Reviewer.java). Read the uploaded bytes, check the size and contents, convert them to text, and send the review or error back. Explain the interface and why Main calls it. | Own the [upload form](frontend/components/review-workspace.tsx) and the [Next.js route that starts Java](frontend/app/api/review/route.ts). |
| **Shivam** | Own [GroqReviewer.java](src/reviewx/GroqReviewer.java) and the [Groq request template](groq-request.json). Build the request, call Groq, read the review from its JSON reply, and handle failed or incomplete responses. Explain the constructor and private API key field. | Own the [results panel](frontend/components/review-result.tsx), including the numbered review points and copyable code. |

## Java viva walkthrough

1. **Pankaj** starts with `Main.java` and traces a sample upload through `System.in`, the UTF-8 conversion, and the call to `Reviewer.review()`. An empty file demonstrates exception handling.
2. **Shivam** follows `GroqReviewer.review()` through the HTTP request, response checks, and extraction of the review JSON. The page then shows the summary, points, and cleaned-up code.

Use the [Java Backend Guide](docs/ReviewX-Java-Backend-Guide.docx) for the complete line-by-line walkthrough, the reading order, and the syllabus concepts used in the project.
