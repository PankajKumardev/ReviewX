# Feature ownership

| Member | Java features | Frontend features |
| --- | --- | --- |
| Pankaj Kumar | Read uploaded files, check for empty or oversized input, convert file bytes to text, calculate file stats, and run the review through the `Reviewer` interface. | Choose or drop a file, validate it, and send it to Java for review. |
| Shivam | Build and send the Groq request, extract the structured review from the response, handle failed or incomplete replies, and build the downloadable text report. | Display file stats, feedback, and cleaned-up code. Let users copy the code or download the review. |

## Java concepts used

| Member | Feature | Java concepts |
| --- | --- | --- |
| Pankaj Kumar | Read and validate uploads | Standard input and output (`System.in`, `System.out`, `System.err`), byte arrays (`byte[]`), UTF-8 strings, `if` checks, and `try`/`catch` for errors. |
| Pankaj Kumar | Calculate file stats | Generics and collections (`List<String>`), a stream to split and collect lines, a for-each loop, counters, and comparisons. |
| Pankaj Kumar | Run the review | Object creation with `new`, an interface reference (`Reviewer`), and polymorphism when calling `review()` on a `GroqReviewer` object. |
| Shivam | Set up and call Groq | A class and constructor, encapsulation with a `private final` field, `this`, file I/O with `Files.readString()`, and the JDK HTTP client. |
| Shivam | Read the response and handle errors | Interface implementation with `implements` and `@Override`, exceptions with `throws` and `try`/`catch`, and parsing JSON with Gson. |
| Shivam | Build the text download | String concatenation with `+` and `+=`, a for-each loop for numbered feedback, and an `if` check to include cleaned-up code when available. |

The backend classes use the `reviewx` package and imports for JDK and Gson types.
