package reviewx;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class Main {
    public static void main(String[] args) {
        try {
            // Next.js sends the uploaded file through standard input.
            int maxFileSize = 20 * 1024;
            byte[] fileBytes = System.in.readNBytes(maxFileSize + 1);
            if (fileBytes.length > maxFileSize) {
                throw new IOException("Choose a file of 20 KB or less.");
            }

            String fileText = new String(fileBytes, StandardCharsets.UTF_8);
            if (fileText.isBlank()) {
                throw new IOException("The file is empty.");
            }

            // Ask Groq to review the text, then print the result for Next.js.
            String apiKey = System.getenv("GROQ_API_KEY");
            Reviewer reviewer = new GroqReviewer(apiKey);
            String review = reviewer.review(fileText);
            System.out.print(review);
        } catch (IOException | InterruptedException error) {
            // Print errors separately so Next.js can tell them apart from the review.
            System.err.println(error.getMessage());
            System.exit(1);
        }
    }
}
