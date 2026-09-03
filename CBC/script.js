const imageIn = document.getElementById("imageIn")
console.log(imageIn)
imageIn.addEventListener("change",(e)=>{
    console.log(e.target)
    const image = e.target.files[0]
    console.log(image)
})