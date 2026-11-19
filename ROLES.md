# Feature ownership

| Member | Java features | Frontend features |
| --- | --- | --- |
| Pankaj Kumar | Read uploaded files, check for empty or oversized input, convert file bytes to text, calculate file stats, and run the review through the `Reviewer` interface. | Choose or drop a file, validate it, and send it to Java for review. |
| Shivam | Build and send the Groq request, extract the structured review from the response, and handle failed or incomplete replies. | Display the file stats, summary, and numbered feedback, show the cleaned-up code, and let users copy it. |
