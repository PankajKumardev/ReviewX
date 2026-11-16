/**
 * One source file selected by the user in the browser.
 * Java does not read the user's disk. It only stores the text the browser sent.
 */
public class SourceFile {
    private String path;
    private String content;

    public SourceFile(String path, String content) {
        this.path = path;
        this.content = content;
    }

    public String getPath() {
        return path;
    }

    public String getContent() {
        return content;
    }
}
