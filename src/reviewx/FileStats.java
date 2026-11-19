package reviewx;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.util.List;

public class FileStats {
    public static String addToReview(String fileText, String review) throws IOException {
        // Make a list with one entry per line in the uploaded file.
        List<String> lines = fileText.lines().toList();
        int blankLines = 0;
        int longestLine = 0;

        // Look at each line once and update the two counts.
        for (String line : lines) {
            if (line.isBlank()) {
                blankLines++;
            }
            if (line.length() > longestLine) {
                longestLine = line.length();
            }
        }

        JsonObject stats = new JsonObject();
        stats.addProperty("totalLines", lines.size());
        stats.addProperty("blankLines", blankLines);
        stats.addProperty("longestLine", longestLine);

        // Add the numbers to the same JSON reply that holds the AI review.
        try {
            JsonObject result = JsonParser.parseString(review).getAsJsonObject();
            result.add("fileStats", stats);
            return result.toString();
        } catch (RuntimeException error) {
            throw new IOException("Groq sent an unreadable review. Try again.", error);
        }
    }
}
