const mongoose=require("mongoose");
const connect =mongoose.connect("mongodb+srv://yashmeshram:Yash123@student.mbe7b1s.mongodb.net/?retryWrites=true&w=majority&appName=AtlasApp");

// check connection

connect.then(() =>{
    console.log("Database connected suceessfully");
})
.catch(() =>{
    console.log("Database not connected")


});

//create schema 

// Update schema to include name, roll, and department
const LoginSchema= new mongoose.Schema({
    registrationno :{
        type: String,
        required : true
    },
    password :{
        type : String,
        required : true
    },
    name: {
        type: String,
        required: true
    },
    roll: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    }
});

// Update model to include new schema
const collection = new mongoose.model("users",LoginSchema);

module.exports=collection;
