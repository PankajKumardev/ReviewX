# Feature ownership

| Member | Java features | Frontend features |
| --- | --- | --- |
| Pankaj Kumar | Read uploaded files, check for empty or oversized input, convert file bytes to text, calculate file stats, and run the review through the `Reviewer` interface. | Choose or drop a file, validate it, and send it to Java for review. |
| Shivam | Build and send the Groq request, extract the structured review from the response, handle failed or incomplete replies, and build the downloadable text report. | Display file stats, feedback, and cleaned-up code. Let users copy the code or download the review. |
