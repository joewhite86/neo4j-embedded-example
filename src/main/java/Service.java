import org.apache.commons.configuration.ConfigurationException;
import org.apache.commons.configuration.PropertiesConfiguration;
import org.neo4j.cypher.javacompat.ExecutionEngine;
import org.neo4j.cypher.javacompat.ExecutionResult;
import org.neo4j.graphdb.GraphDatabaseService;
import org.neo4j.graphdb.PropertyContainer;
import org.neo4j.graphdb.Transaction;
import org.neo4j.graphdb.factory.GraphDatabaseFactory;

import java.util.ArrayList;
import java.util.Map;

public class Service {
  GraphDatabaseService graphDb;
  ExecutionEngine executionEngine;
  public void connect(String directory) throws ConfigurationException {
    graphDb = new GraphDatabaseFactory()
        .newEmbeddedDatabaseBuilder(directory)
        .loadPropertiesFromURL(new PropertiesConfiguration("config/neo4j.properties").getURL())
        .newGraphDatabase();
    executionEngine = new ExecutionEngine(graphDb);
  }

  public GraphDatabaseService getDatabase() {
    return graphDb;
  }

  public QueryResult query(String query, Map<String, Object> params) {
    ArrayList<Object[]> results = new ArrayList<>();
    ArrayList<String> columnNames = new ArrayList<>();

    try(Transaction tx = graphDb.beginTx()) {
      ExecutionResult result = executionEngine.execute(query, params);
      Boolean firstRow = true;

      for(Map<String, Object> row : result) {
        ArrayList<Object> rowResult = new ArrayList<>();
        for(String key : row.keySet()) {
          if(firstRow) columnNames.add(key);
          if(row.get(key) instanceof PropertyContainer) {
            rowResult.add(new JavascriptContainer((PropertyContainer) row.get(key)));
          }
          else {
            rowResult.add(row.get(key));
          }
        }
        results.add(rowResult.toArray());
        firstRow = false;
      }

      tx.success();

      return new QueryResult(
          columnNames.toArray(new String[columnNames.size()]),
          results.toArray(new Object[results.size()][])
      );
    }
  }
}
