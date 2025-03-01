export default function TextFieldCredentials({type={text}, ...props})
{
 const filedvalue = (type==="text"?"username":"password");
    return(
        <>
        <input{...props} type={type} placeholder={filedvalue} />
        </>
    );
    
   
    
}