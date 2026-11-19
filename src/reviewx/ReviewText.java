package reviewx;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

public class ReviewText {
    public static String build(JsonObject review) {
        // Start with the file stats, then add each part of the review.
        JsonObject stats = review.getAsJsonObject("fileStats");
        String report = "ReviewX review\n\nFile stats\n";
        report += "Total lines: " + stats.get("totalLines") + "\n";
        report += "Non-blank lines: " + stats.get("nonBlankLines") + "\n";
        report += "Blank lines: " + stats.get("blankLines") + "\n";
        report += "Longest line: " + stats.get("longestLine") + " chars\n\n";

        String summary = review.get("summary").getAsString();
        report += "Summary\n" + summary + "\n\nReview points\n";

        // Read each point and add its title and detail to the report.
        int number = 1;
        for (JsonElement item : review.getAsJsonArray("points")) {
            JsonObject point = item.getAsJsonObject();
            String title = point.get("title").getAsString();
            String detail = point.get("detail").getAsString();
            report += number + ". " + title + "\n   " + detail + "\n\n";
            number++;
        }

        String code = review.get("cleanedCode").getAsString();
        if (!code.isBlank()) {
            report += "Cleaned-up code\n" + code.stripTrailing() + "\n";
        }
        return report;
    }
}
