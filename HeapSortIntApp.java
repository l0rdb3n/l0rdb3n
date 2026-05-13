import java.util.Comparator;
import java.util.Arrays;

/* Java application that creates an array of Integers, uses the heapSort()
** method in the HeapSorter class to sort it, and then prints the array
** elements (which should be in ascending numerical order).
** The intent is to test the heapSort() method and the underlying
** infrastructure supporting it.
**
** Author: R. McCloskey
** Date: December 2025
*/
public class HeapSortIntApp {

   public static void main(String[] args) {

      Integer[] ary = new Integer[] { 25, -7, 36, 2, 14, 29, -1, 46, 0,
                                      15, 35, 26, 17, 32, 0, 57, 4, 9 };

      IntComparator intComp = new IntComparator();
      HeapSorter.heapSort(intComp, ary);
      System.out.println(Arrays.toString(ary));
   }


   private static class IntComparator implements Comparator<Integer> {
      public int compare(Integer a, Integer b) {
         return a.compareTo(b);
      }
   }
}
