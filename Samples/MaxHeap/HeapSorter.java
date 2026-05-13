import java.util.Comparator;

/* Java class that has a static method by which to sort an array using the
** not-in-place version of the HeapSort algorithm (meaning the version in
** which the heap and the array being sorted do not share the same space).
** The method is generic in that the array it receives can contain elements
** of any specified (reference) type; the other parameter is a Comparator
** that defines an ordering on that type.
**
** Author: R. McCloskey and Benjamin Maldonado
** Date: December 2025
*/
public class HeapSorter<T> {

   /* Sorts (i.e., rearranges) the elements in the given array so that
   ** they are in ascending order in accord with the ordering defined by
   ** by the given Comparator.
   */
   public static <T> void heapSort(Comparator<T> comp, T[] a) {

      // Phase 1: Create a max-heap containing the elements in the given array.
      MaxHeap<T> heap = new MaxHeap(comp, a);

      // Phase 2: Empty the heap one element at a time, transferring
      //          its elements, from largest to smallest, into the array.
      for (int i = a.length-1; i >= 0; i--) {
         a[i] = heap.deleteMax();
      }
   }

}
