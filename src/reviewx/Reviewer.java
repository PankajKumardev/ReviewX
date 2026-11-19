package reviewx;

import java.io.IOException;

// Every reviewer takes file text and returns a review as JSON.
public interface Reviewer {
    String review(String fileText) throws IOException, InterruptedException;
}
