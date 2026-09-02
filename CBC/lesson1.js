let r = 255
let g = 0
let b = 88
 function printPixels (givenArray){
   for (const i of givenArray){
   console.log(i.R)
   console.log(i.G)
   console.log(i.B)
   console.log(i.A + "\n")

 }
}
 const pixel = (R,G,B,A) => {
    return {
      R,
      G,
      B,
      A
   }
 }

const array = [pixel(0,0,0,100),pixel(128,128,128,0),pixel(255,255,255,100)]
const newArray = array.filter(monkeys=>{
   return monkeys.R>100
})
printPixels(array)
console.log("\n-----------------------------------------------------------\n")
printPixels(newArray)

