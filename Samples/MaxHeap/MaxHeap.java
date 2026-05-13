import java.util.Comparator;

/* An instance of this generic Java class represents a max-heap.
** An instance of a class that implements the Comparator interface
** is supplied to the constructor for the purpose of defining an
** ordering upon the type of elements occupying the heap.
**
** Author: R. McCloskey and Benjmain Maldonado
** Date: December 2025
** Collaborated with: ...
** Known Defects: ...
*/

public class MaxHeap<T> {

   // instance variables
   // ------------------

   private CompleteBinTree<T> tree; // the resident complete binary tree
   private Comparator<T> comp;      // the resident Comparator

   // constructor
   // -----------

   /* Initializes this heap as being empty and establishes the given
   ** Comparator as defining the ordering upon values of the relevant 
   ** data type.
   */
   public MaxHeap(Comparator<T> comp) {
      this.comp = comp;
      this.tree = new CompleteBinTree<T>();
   }

   /* Initializes this heap to contain the elements in the given
   ** array and establishes the given Comparator as defining the
   ** ordering upon the values of the relevant data type.
   */
   public MaxHeap(Comparator<T> comp, T[] values) {
      this.comp = comp;

      populateHeap(values);   // uses heapify()
      // Alternative to line above:
      // populateHeap2(values);  // uses siftUp()

      // for debugging purposes:
      tree.printTree();
      
   }

   // observers
   // ---------

   /* Returns the number of elements in this heap.
   */
   public int sizeOf() { return tree.sizeOf(); }

   /* Reports whether or not this heap is empty (i.e., has size zero).
   */
   public boolean isEmpty() { return sizeOf() == 0; }

   /* Returns the maximum-valued element in this heap.
   ** pre: !isEmpty()
   */
   public T getMax() { return tree.elemAt(tree.idOfRoot()); }


   // mutators
   // --------

   /* Removes the maximum-valued element from this heap.
   ** pre: !isEmpty()
   */
   public T deleteMax() {
      T maxVal = getMax();
      T lastNodeVal = tree.removeLastNode();

      if (!tree.isEmpty()) {
         int rootID = tree.idOfRoot();
         tree.replace(rootID, lastNodeVal);
         siftDown(rootID);
      }

      // for debugging purposes:
      // tree.printTree();
      // verifyHeapProperty();

    

      return maxVal;
   }


   /* Populates this heap with the values in the given array.
   ** (Any former contents of the heap are lost.)
   ** This version uses the heapify() method.
   */
   public void populateHeap(T[] values) {
      this.tree = new CompleteBinTree<T>(values.length);
      for (int i=0; i != values.length; i++) {
         tree.addNode(values[i]);
      }
      heapify(tree.idOfRoot()); 

      // for debugging purposes:
      // tree.printTree();
   }

   /* An alternative to the method above.
   ** This version uses the siftUp() method.
   */
   public void populateHeap2(T[] values) {
      this.tree = new CompleteBinTree<T>(values.length);
      for (int i=0; i != values.length; i++) {
         tree.addNode(values[i]);
         siftUp(tree.idOfLastNode());
      }

      // for debugging purposes:
      // tree.printTree();
   }


   // private methods
   // ---------------

   /* Performs a siftup operation on node k of the tree.
   ** How:
   **   If k is the ID of the root, there is nothing to do.
   **   Otherwise, if the element in node k is greater than that in
   **   its parent node, swap the contents of those two nodes and
   **   recursively sift up from the parent node.  (Alternatively,
   **   one could use a loop.) 
   ** pre: tree.isValidNodeID(k)
   */
   private void siftUp(int k) {
      if (k != tree.idOfRoot()) {
         int parentID = tree.idOfParent(k);
         T elemAtK = tree.elemAt(k);
         T elemAtParent = tree.elemAt(parentID);
         if (greaterThan(elemAtK, elemAtParent)) {
            tree.replace(k, elemAtParent);
            tree.replace(parentID, elemAtK);
            siftUp(parentID);
         }
      }


      // for debugging purposes:
      //tree.printTree();
      // verifyHeapProperty()
   }


   /* Performs a siftdown operation on node k of the tree.
   ** How:
   **   If k identifies a leaf node, nothing needs to be done.
   **   Otherwise, identify the child of node k containing the larger 
   **   element (among the two, if there is both a left and right child).
   **   Compare the element in node k with that larger child element.
   **   If the latter element is greater than the former, swap the 
   **   elements in those two nodes and then recursively sift down from
   **   that child node.  (Alternatively, a loop could be used.)
   ** pre: tree.isValidNodeID(k)
   */
   private void siftDown(int k) {
      if (!tree.isLeaf(k)) {
         T elemAtK = tree.elemAt(k);
         int childID =idOfBiggerChild(k);
         T elemAtChild = tree.elemAt(childID);
         if (greaterThan(elemAtChild, elemAtK)) {
               tree.swap(k,childID);
               siftDown(childID);
         }
         
      }
 

      // for debugging purposes:
      
      // verifyHeapProperty();
   }

   /* Returns the ID of the child of node k having the larger element
   ** stored in it.  (Ties go to the right child.)
   ** pre: tree.isValidNodeID(k)  &&  tree.hasLeftChild(k))
   */
   private int idOfBiggerChild(int k) {
      int leftChildID = tree.idOfLeftChild(k);
      int idOfBigger = leftChildID;

      if (tree.hasRightChild(k)) {
         T valueInLeftChild = tree.elemAt(leftChildID);
         int rightChildID = tree.idOfRightChild(k);
         T valueInRightChild = tree.elemAt(rightChildID);
         if (!greaterThan(valueInLeftChild, valueInRightChild)) {
            idOfBigger = rightChildID;
         }
      }
      return idOfBigger;
   }

   /* Reports whether or not x is greater than y according to the
   ** resident comparator.
   */
   private boolean greaterThan(T x, T y) {
      return comp.compare(x,y) > 0;
   }

   /* Heapifies the subtree of 'tree' rooted at the node with ID k,
   ** meaning that the collection of values stored in the nodes of
   ** that subtree will be moved around so as to satisfy the condition
   ** that no node contains a value larger than that stored in its parent.
   ** How:
   **   If k is not a valid node ID, or if k is the ID of a leaf node,
   **   then nothing needs to be done.
   **   Otherwise, recursively heapify the subtree(s) rooted at node k's
   **   left child and (if it exists) right child.  Then sift down from
   **   node k.
   */
   private void heapify(int k) {
      if(tree.isValidNodeID(k) && !tree.isLeaf(k)){
         heapify(tree.idOfLeftChild(k));
         if (tree.hasRightChild(k)) {
            heapify(tree.idOfRightChild(k));
         }
         siftDown(k);
      }
      
   }

   /* Reports whether or not 'tree' satisfies the property of being a
   ** max-heap, which requires that none of its non-root nodes contains an
   ** element that is greater than (according to the resident Comparator)
   ** the element in its parent node.
   ** Intended to be used for debugging purposes.
   */
   private boolean verifyHeapProperty() {
      return verifyHeapPropertyAux(tree.idOfRoot());
   }

   /* Auxiliary to the method above, reports whether or not the subtree
   ** of 'tree' rooted at the node with the specified ID satisfies the
   ** property of being a heap.
   ** Intended to be used for debugging purposes.
   */
   private boolean verifyHeapPropertyAux(int k) {
      boolean result;
      if (!tree.isValidNodeID(k)  ||  tree.isLeaf(k)) {
         result= true;
      }
      else {
         T elemAtNodeK = tree.elemAt(k);
         int biggerChildID = idOfBiggerChild(k);
         T biggerChildElem  = tree.elemAt(biggerChildID);
         if (greaterThan(biggerChildElem, elemAtNodeK)) {
            result = false;
            System.out.printf("ERROR: Node %d contains %s\n", k, elemAtNodeK);
            System.out.printf("       and has a child containing the larger %s\n",
                              biggerChildElem);
         }
         else {
            result = verifyHeapPropertyAux(tree.idOfLeftChild(k)) &&
                     verifyHeapPropertyAux(tree.idOfRightChild(k));
         }
      }
      return result;
   }

}
