import java.util.List;

/**
 * A reviewer looks at source files and returns findings.
 * LocalReviewer and GroqReviewer both implement this interface.
 */
public interface Reviewer {
    List<Finding> review(List<SourceFile> files);
}
