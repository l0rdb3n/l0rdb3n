import java.util.ArrayList;

/* An instance of this class represents a polynomial with integer coefficients.
** The "arithmetic" operations of addition, subtraction, and multiplication
** of polynomials is supported by mutator methods.  Among the observer
** methods are one that attempts to find a root (i.e., zero) within a
** given interval and another that evaluates a polynomial at a specified 
** real value.
**
** Authors: R. McCloskey and Benjamin Maldonado
** Aided by: ...
** Known defects: ...
*/
//hes
public class Polynomial {

   //  instance variables 
   //  ------------------

   protected ArrayList<Integer> coeff; // coeff.get(i) is the coefficient of
                                       // x^i in this polynomial
   protected int degree;               // the degree of this polynomial


   //  constructors
   //  ------------

   /* Establishes this polynomial as the zero polynomial (having degree 
   ** zero and coefficient zero).
   */
   public Polynomial() { this(new ArrayList<Integer>(1)); }

   /* Establishes this polynomial to have as coefficients the values in
   ** the given ArrayList al, with al.get(k) (for each value of k) being the
   ** coefficient of the x^k term.
   */
   public Polynomial(ArrayList<Integer> al) { create(al); }

   /* Establishes this polynomial to have as coefficients the values in 
   ** the specified array c[], with c[i] (for each value of i) being the
   ** coefficient of the x^i term.  If c has length zero, this polynomial
   ** is made to be the zero polynomial.
   */
   public Polynomial(int[] ary) { create(toArrayList(ary)); }


   //  observers
   //  ---------

   /* Returns the degree of this polynomial.
   */
   public int degreeOf() { return this.degree; }


   /* Returns the coefficient of x^k in this polynomial.
   ** (If k > degreeOf(), zero is returned.)
   */
   public int coefficient(int k) { 
      return k <= degreeOf() ? coeff.get(k) : 0;
   }


   /* Returns the result of evaluating this polynomial at the specified 
   ** value (x).
   */
   public double valueAt(double x) {
      double sum = coefficient(degreeOf());
      
      for (int i = degreeOf() - 1; i >= 0; i--) {
         sum = coefficient(i) + x * sum ;
      }
      
      return sum;
   }

   /* Returns a value within the interval [low,high] that is within EPSILON 
   ** units of a root (aka zero) of this polynomial.
   ** An exception is thrown if any of the following is found to be true:
   ** (1) EPSILON <= 0
   ** (2) low > high
   ** (3) the product of valueAt(low) and valueAt(high) is positive
   **     (in which case there is no guarantee of there being a root
   **     in the interval [low,high]).
   */
   public double rootOf(double low, double high, double EPSILON) {
      if (EPSILON <= 0) {
         throw new IllegalArgumentException("EPSILON must be positive");
      }

      if (low > high) {
         throw new IllegalArgumentException("Empty interval");
      }

      if (valueAt(low) * valueAt(high) > 0) {
         //System.out.println(Result:  valueAt(low) * valueAt(high));
         throw new IllegalArgumentException("Values at endpoints have same sign!");
      } 
      double  mid = (high+low)/2;
      while(Math.abs(valueAt(mid)) > EPSILON){
         mid = (high+low)/2;
         if (valueAt(mid)>0){
            high = mid;
            //System.out.println("High:  "+valueAt(high));
         }else if (valueAt(mid)<0){
            low = mid;
           // System.out.println("Low: " + valueAt(low));
         } else{
            break;
         }
      } 

      return mid;   
   }

   /* Reports whether this polynomial is "equal to" the given one.
   ** Two polynomials are equal iff they have the same degree and 
   ** their coefficients match.
   */
   public boolean equals(Polynomial other) {
      boolean equalSoFar = true;
      if (this.degreeOf() != other.degreeOf()) { equalSoFar = false; }
      else {
         int k = this.degreeOf();
         // loop invariant: all coefficients of degree > k agree
         while (k != -1  &&  this.coefficient(k) == other.coefficient(k)) {
            k = k-1;
         }
         // assertion: k == -1 implies that all coefficients agree
         //            k != -1 implies that the coefficients of the degree k
         //                    terms disagree.
         equalSoFar = k == -1;
      }
      return equalSoFar;
   }


   /* Returns a string describing the polynomial. 
   ** Examples: "3 - 4x + 17x^2 + 2x^4"
   **            "-7x + 3x^4 - 2x^5"
   */
   @Override
   public String toString() {
      StringBuilder sb = new StringBuilder("" + coefficient(0));
      for (int j = 1; j <= degreeOf(); j++) {
         String c  = "^"+ j;
         if (c.equals("^1")){c = "";}
         if(coefficient(j)!=0 && coefficient(j)!= 1){
            sb.append(" + " + coefficient(j) + "x" + c);
         } else if (coefficient(j)== 1){
            sb.append(" + x"+c);
         }
         //doesn't print 0 coefficent
         
      }
      return sb.toString();
   }


   // mutators 
   // --------


   /* In effect, carries out the assignment this = this + p, which is to
   ** say that this Polynomial is modified so that it becomes the sum of
   ** its previous value and p.
   */
   public void addTo(Polynomial p) {
      
      
      for (int i = this.degreeOf(); i >= 0; i--) {
         this.setCoefficient(i, this.coefficient(i) + p.coefficient(i));
      }
      
      
   }

   /* In effect, carries out the assignment this = this - p, which is to
   ** say that this Polynomial is modified so that it becomes the difference
   ** between its previous value and p.
   */
   public void subtractFrom(Polynomial p) {
      for (int i = this.degreeOf(); i >= 0; i--) {
         this.setCoefficient(i, this.coefficient(i) - p.coefficient(i));
      }
   }

   /* In effect, carries out the assignment this = this * p, which is to
   ** say that this Polynomial is modified so that it becomes the product
   ** of its previous value and p.
   */
   public void multiplyBy(Polynomial p) {
      for (int i = this.degreeOf()+p.degreeOf(); i >= 0; i--) {
         int product = 0;
         for (int j = 0; j <= i; j++ ) {
            product = product +(this.coefficient(j)*p.coefficient(i-j));
         }
         this.setCoefficient(i,product);
      }
   }


   /* Within this polynomial, sets the coefficient in the degree 'k' term 
   ** to 'val'. 
   ** pre: 0 <= k
   */
   private void setCoefficient(int k, int val) {
      if (k < coeff.size()) {
         coeff.set(k, val);
      }
      else {
         // Establish that zero is the coefficient of all terms with
         // exponents in the range [coeff.size() .. k).
         for (int j = coeff.size(); j < k; j++) {
            coeff.add(j,0);
         }
         coeff.add(k, val);
      }
      determineDegree();
   }


   /* Returns a clone of this polynomial.
   */
   //@Override
   public Polynomial clone() { return new Polynomial(coeff); }



   //  private utility methods
   //  ------------------------


   /* Returns an ArrayList containing the same sequence of values
   ** as the given array.
   */
   private ArrayList<Integer> toArrayList(int[] c) {
      ArrayList<Integer> result = new ArrayList<Integer>(c.length);
      for (int i=0; i != c.length; i++) {
         result.add(i, c[i]);
      }
      return result;
   }

   @SuppressWarnings("unchecked")
   private void create(ArrayList<Integer> al) {
      // Make coeff a clone of the given ArrayList, but then add a
      // zero element in the case that its length is zero.
      this.coeff = (ArrayList<Integer>)(al.clone());
      if (coeff.size() == 0) { coeff.add(0,0); }
      determineDegree();
   }

   /* Sets the instance variable 'degree' to the degree of this polynomial
   ** (i.e., the largest k such that coefficient(k) != 0, or zero if all
   ** coefficients are zero).
   */
   private void determineDegree() {
      int k = coeff.size() - 1;
      // loop invariant: coeff.get(j) == 0.0 for all j > k
      while (k != 0 && coeff.get(k) == 0.0) {
         k = k-1;
      } 
      // assertion: coeff.get(j) == 0.0 for all j > k &&
      //            (k == 0  ||  coeff.get(k) != 0.0)
      //     from which it follows that k is the degree of the polynomial
      this.degree = k;
      //System.out.println(k);
   }

}
