import java.util.Arrays;

/* An instance of this class represents a complete binary tree, meaning
** a binary tree in which the number of nodes on levels 0, 1, ..., h-1,
** where h is the height of the tree, is the maximum possible, and the
** nodes on level h occupy the leftmost possible positions.
**
** The nodes are identified by integer IDs starting at zero, where the
** nodes are numbered from top level to bottom level, from left-to-right
** across each level.  (Specifically, the root has ID zero and for each k,
** the left and right children of node k are, respectively, the nodes 
** with IDs 2k+1 and 2k+2.  The classic array-based representation is 
** employed, with node k's value being stored in location k of the array.
**
** Author: R. McCloskey and Benjamin Maldonado
** Date last modified: Dec. 2025
*/

public class CompleteBinTree<T> {

   // class constants
   // ---------------

   private static final int DEFAULT_INIT_CAPACITY = 16;
   private static final int MIN_CAPACITY = 16;

   // instance variables
   // -------------------
   
   private T[] node;      // node[k] stores the value occupying node k 
   private int numNodes;  // # nodes in the tree
   
   
   // constructor
   // -----------

   /* Establishes this tree to be empty.  The parameter is to provide
   ** an estimate of the size that the tree will need to become.
   */
   public CompleteBinTree(int estimatedSize) {
      node = newArray(estimatedSize);
      numNodes = 0;
   }
   
   /* Establishes this tree to be empty.
   */
   public CompleteBinTree() {
      this(DEFAULT_INIT_CAPACITY);
   }
   
   // observers
   // ---------
   
   /* Returns the # of nodes in this tree.
   */
   public int sizeOf() { return numNodes; }
   
   /* Returns true if this tree is empty, otherwise false.
   */
   public boolean isEmpty() { return sizeOf() == 0; }

   /* Reports whether or not the given number (k) is the ID of a
   ** node in this tree.
   */
   public boolean isValidNodeID(int k) {
      return 0 <= k  &&  k < sizeOf();
   }
   
   /* Returns the element stored in node k.
   ** pre: isValidNodeID(k) (i.e., 0 <= k < sizeOf())
   */
   public T elemAt(int k) { return node[k]; }
   
   /* Returns the ID of the root node.
   ** pre: !isEmpty()
   */
   public int idOfRoot() { return 0; }

   /* Returns the ID of the "rightmost" node on the
   ** "bottom-most" level of this tree.
   ** pre: !isEmpty()
   */
   public int idOfLastNode() { return numNodes-1; }

   /* Returns the ID of node k's parent.
   ** pre: k != idOfRoot()  &&  isValidNodeID(k) (i.e., 0 <= k < sizeOf())
   */
   public int idOfParent(int k) { return (k-1) / 2; }
   
   /* Returns the ID of node k's left child (or an invalid ID if node k
   ** has no left child).
   ** pre: isValidNodeID(k) (i.e., 0 <= k < sizeOf())
   */
   public int idOfLeftChild(int k) { return 2*k + 1; }
   
   /* Returns the ID Of node k's right child (or an invalid ID if node k
   ** has no right child).
   ** pre: isValidNodeID(k) (i.e., 0 <= k < sizeOf())
   */
   public int idOfRightChild(int k) { return idOfLeftChild(k) + 1; }
   
   /* Reports whether or not node k has a left child.
   ** pre: isValidNodeID(k) (i.e., 0 <= k < sizeOf())
   */
   public boolean hasLeftChild(int k) { 
      return isValidNodeID(idOfLeftChild(k));
   }
   
   /* Reports whether or not node k has a right child.
   ** pre: isValidNodeID(k) (i.e., 0 <= k < sizeOf())
   */
   public boolean hasRightChild(int k) { 
      return isValidNodeID(idOfRightChild(k));
   }
   
   /* Reports whether or not node k is a leaf node.
   ** pre: isValidNodeID(k) (i.e., 0 <= k < sizeOf())
   */
   public boolean isLeaf(int k) { return !hasLeftChild(k); }

 
   /* Prints the values in this tree in a way that is laid out so that
   ** it looks like a tree, rotated sideways.
   */
   public void printTree() { printTree(idOfRoot()); }

   /* Prints the values in the subtree rooted at the node with the
   ** specified ID in a way that is laid out so that it looks like a 
   ** tree, rotated sideways.
   */
   public void printTree(int k) { printTreeAux(k, 0); }

   /* Auxiliary to the printTree() method, prints the values in the
   ** subtree rooted at node k, which is assumed to be at the given
   ** depth (i.e., distance from the tree's root).
   */
   private void printTreeAux(int k, int depth) {
      if (hasRightChild(k)) {
         printTreeAux(idOfRightChild(k), depth+1);
      }
      printSpaces(3*depth);
      System.out.printf("%d:%s\n", k, elemAt(k));

      if (hasLeftChild(k)) {
         printTreeAux(idOfLeftChild(k), depth+1);
      }
   }

   /* Prints the specified number of spaces (onto standard output).
   */
   private void printSpaces(int n) {
      for (int i = 0; i != n; i++) { System.out.print(' '); }
   }
   

   // mutators
   // --------

   /* Places the specified value into the node with the
   ** specified ID (k), replacing whatever value had been there.
   ** pre: isValidNodeID(k) (i.e., 0 <= k < sizeOf())
   */
   public void replace(int k, T val) { node[k] = val; }

   /* Swaps the values in the nodes with IDs j and k.
   ** pre: isValidNodeID(j) && isValidNodeID(k)  
   **      (i.e., 0 <= j < sizeOf()  &&  0 <= k < sizeOf())
   */
   public void swap(int j, int k) {
      T temp = node[j];
      node[j] = node[k];
      node[k] = temp;
   }
   
   /* Inserts a new node containing the specified value.  The new node
   ** becomes the "last" node in this tree (i.e., the "rightmost" node
   ** in the "bottom-most" level).
   */
   public void addNode(T val) {
      // If node[] is full to its capacity, double its length.
      if (numNodes == node.length) {
         resizeArray(2 * numNodes);
      }
      node[numNodes] = val;
      numNodes = numNodes + 1;
   }

   /* Removes the "last" node in this tree (i.e., the "rightmost" node in the
   ** "bottom-most" level) and returns the value that had been stored there.
   ** pre: !isEmpty()
   */
   public T removeLastNode() {
      T result = elemAt(numNodes-1);
      numNodes = numNodes - 1;

      // If the size of the tree is now less than a quarter of the length
      // of the array in which its values are stored, and the length of the
      // array is at least twice its minimum allowed length, cut the array's
      // length in half, in effect.
      if (numNodes < node.length / 4  &&  node.length >= 2 * MIN_CAPACITY) {
         resizeArray(node.length / 2);
      }

      return result;
   }


   // private methods
   // ---------------

   /* Returns a new array of type T[] of the specified length.
   */
   private T[] newArray(int length) {
      return (T[])(new Object[length]);
   }
   
   /* Has the effect of changing the length of the array referred to by
   ** node[] so that it has the specified length and so that its first 
   ** numNodes elements are the same as before.
   ** (Note that the length of the array referred to by 'node' is not 
   ** literally being changed, as an array's length is fixed.  Rather,
   ** a new array of the specified length is being created, and the value
   ** of 'node' is changed to refer to that new array.)
   ** The precondition is to ensure that no data is lost from the array.
   ** pre: sizeOf() <= newLength;
   */
   private void resizeArray(int newLength) {
      node = Arrays.copyOf(node, newLength);
   }
   
}
