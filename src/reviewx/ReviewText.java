package reviewx;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

public class ReviewText {
    public static String build(JsonObject review) {
        // Start the text report with the numbers Java calculated.
        JsonObject stats = review.getAsJsonObject("fileStats");
        StringBuilder text = new StringBuilder("ReviewX review\n\n");
        text.append("File stats\n");
        text.append("Total lines: " + stats.get("totalLines").getAsInt() + "\n");
        text.append("Non-blank lines: " + stats.get("nonBlankLines").getAsInt() + "\n");
        text.append("Blank lines: " + stats.get("blankLines").getAsInt() + "\n");
        text.append("Longest line: " + stats.get("longestLine").getAsInt() + " chars\n\n");

        text.append("Summary\n");
        text.append(review.get("summary").getAsString()).append("\n\n");

        // Give each AI review point a number in the download.
        text.append("Review points\n");
        JsonArray points = review.getAsJsonArray("points");
        int number = 1;
        for (JsonElement item : points) {
            JsonObject point = item.getAsJsonObject();
            text.append(number + ". " + point.get("title").getAsString() + "\n");
            text.append("   " + point.get("detail").getAsString() + "\n\n");
            number++;
        }

        String code = review.get("cleanedCode").getAsString();
        if (!code.isBlank()) {
            text.append("Cleaned-up code\n");
            text.append(code.stripTrailing()).append('\n');
        }
        return text.toString();
    }
}
