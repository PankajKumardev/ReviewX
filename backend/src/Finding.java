/**
 * One issue found during review.
 * The same class is used for local checks and for Groq suggestions.
 */
public class Finding {
    private String file;
    private int line;
    private String severity;
    private String category;
    private String message;
    private String explanation;
    private String suggestion;
    private String source;

    public Finding(String file, int line, String severity, String category,
                   String message, String explanation, String suggestion, String source) {
        this.file = file;
        this.line = line;
        this.severity = severity;
        this.category = category;
        this.message = message;
        this.explanation = explanation;
        this.suggestion = suggestion;
        this.source = source;
    }

    public String getFile() {
        return file;
    }

    public int getLine() {
        return line;
    }

    public String getSeverity() {
        return severity;
    }

    public String getCategory() {
        return category;
    }

    public String getMessage() {
        return message;
    }

    public String getExplanation() {
        return explanation;
    }

    public String getSuggestion() {
        return suggestion;
    }

    public String getSource() {
        return source;
    }
}
