import org.neo4j.graphdb.*;
import org.neo4j.helpers.collection.IteratorUtil;

import java.util.NoSuchElementException;

public class UserController {
  private static final Label Label = DynamicLabel.label("User");
  Service service;
  public UserController(Service service) {
    this.service = service;

    // just create a user for example purpuse
    if(search("test") == null) {
      try(Transaction tx = service.getDatabase().beginTx()) {
        Node user = service.getDatabase().createNode(Label);
        user.setProperty("name", "test");
        tx.success();
      }
    }
  }

  public JavascriptContainer search(String name) {
    try(Transaction tx = service.getDatabase().beginTx()) {
      ResourceIterable<Node> results = service.getDatabase().findNodesByLabelAndProperty(Label, "name", name);
      Node user = IteratorUtil.single(results);
      tx.success();
      return new JavascriptContainer(user);
    }
    catch(NoSuchElementException e) {
      return null;
    }
  }
}
