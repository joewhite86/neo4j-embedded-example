## Example usage of neo4j embedded in node.js

I started this repository, to give you guys in need for high performance with neo4j a clue how to integrate neo into a node.js environment.

This is an example of how to achieve this. There are a few helper classes, that mainly convert objects between the languages for better performance.

Keep in mind, that each request, to a Java Method, opens a new Thread inside the vm, so use carefully.


For best performance, write as many application logic as possible in Java code.