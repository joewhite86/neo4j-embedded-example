public class QueryResult {
  public String[] columnNames;
  public Object[][] result;
  public QueryResult(String[] columnNames, Object[][] result) {
    this.columnNames = columnNames.clone();
    this.result = result.clone();
  }
}
