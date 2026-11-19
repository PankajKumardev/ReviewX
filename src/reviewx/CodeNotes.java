package reviewx;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import java.util.List;

public class CodeNotes {
    public static JsonObject find(List<String> lines) {
        JsonArray matches = new JsonArray();
        int total = 0;
        int lineNumber = 0;

        // Check each line for the two note markers.
        for (String line : lines) {
            lineNumber++;
            if (line.contains("TODO") || line.contains("FIXME")) {
                total++;

                // Show the first five matches and still count the rest.
                if (matches.size() < 5) {
                    JsonObject note = new JsonObject();
                    note.addProperty("lineNumber", lineNumber);
                    note.addProperty("text", line.strip());
                    matches.add(note);
                }
            }
        }

        JsonObject notes = new JsonObject();
        notes.addProperty("total", total);
        notes.add("matches", matches);
        return notes;
    }
}
