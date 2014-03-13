import org.neo4j.graphdb.*;

import java.util.*;

public class JavascriptContainer implements PropertyContainer {
  long id;
  Map<String, Object> properties = new HashMap<>();
  List<String> labels = new ArrayList<>();
  public class Property {
    public String name;
    public Object value;
    public Property(String name, Object value) {
      this.name = name;
      this.value = value;
    }
  }

  public JavascriptContainer(PropertyContainer node) {
    for(String key: node.getPropertyKeys()) properties.put(key, node.getProperty(key));
    if(node instanceof Node) {
      this.id = ((Node)node).getId();
      for(Label label: ((Node)node).getLabels()) labels.add(label.name());
    }
    else {
      ((Relationship)node).getId();
    }
  }

  public static JavascriptContainer[] getForList(List<Node> nodes) {
    JavascriptContainer[] container = new JavascriptContainer[nodes.size()];
    for(int i = 0, length = nodes.size(); i < length; i++) {
      container[i] = new JavascriptContainer(nodes.get(i));
    }
    return container;
  }

  public GraphDatabaseService getGraphDatabase() {
    return null;
  }

  public boolean hasProperty(String s) {
    return properties.containsKey(s);
  }

  public long getId() {
    return id;
  }

  public Object getProperty(String s) {
    return properties.get(s);
  }

  public Object getProperty(String s, Object o) {
    return properties.containsKey(s)? properties.get(s): o;
  }

  public void setProperty(String s, Object o) {
    throw new UnsupportedOperationException("cant set properties");
  }

  public Object removeProperty(String s) {
    throw new UnsupportedOperationException("cant remove properties");
  }

  public String[] getLabels() {
    return labels.toArray(new String[labels.size()]);
  }

  public Iterable<String> getPropertyKeys() {
    return properties.keySet();
  }

  public Property[] getProperties() {
    Property[] result = new Property[this.properties.size()];
    Iterator<String> keys = this.properties.keySet().iterator();
    int i = 0;

    while(keys.hasNext()) {
      String key = keys.next();
      result[i++] = new Property(key, this.properties.get(key));
    }

    return result;
  }
}
