package reviewx;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

public class GroqReviewer implements Reviewer {
    private final String apiKey;

    public GroqReviewer(String apiKey) {
        this.apiKey = apiKey;
    }

    @Override
    public String review(String fileText) throws IOException, InterruptedException {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IOException("Set GROQ_API_KEY before starting ReviewX.");
        }

        // Build the request, send it, and return the review from Groq's reply.
        HttpRequest request = makeRequest(fileText);
        HttpClient client = HttpClient.newHttpClient();
        HttpResponse<String> reply = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (reply.statusCode() != 200) {
            throw new IOException("Groq returned HTTP " + reply.statusCode() + ".");
        }
        return readReview(reply.body());
    }

    private HttpRequest makeRequest(String fileText) throws IOException {
        // The template has the prompt. Add the uploaded file as a second message.
        String template = Files.readString(Path.of("groq-request.json"));
        JsonObject body = JsonParser.parseString(template).getAsJsonObject();
        JsonObject upload = new JsonObject();
        upload.addProperty("role", "user");
        upload.addProperty("content", fileText);
        body.getAsJsonArray("messages").add(upload);

        String url = "https://api.groq.com/openai/v1/chat/completions";
        return HttpRequest.newBuilder(URI.create(url))
                .header("Authorization", "Bearer " + apiKey.trim())
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(45))
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();
    }

    private String readReview(String replyText) throws IOException {
        try {
            // Groq wraps the review inside its first choice.
            JsonObject reply = JsonParser.parseString(replyText).getAsJsonObject();
            JsonObject firstChoice = reply.getAsJsonArray("choices").get(0).getAsJsonObject();
            if ("length".equals(firstChoice.get("finish_reason").getAsString())) {
                throw new IOException("The review was too long. Try a shorter file.");
            }
            JsonObject message = firstChoice.getAsJsonObject("message");
            return message.get("content").getAsString();
        } catch (RuntimeException error) {
            throw new IOException("Groq sent an unreadable review. Try again.", error);
        }
    }
}
