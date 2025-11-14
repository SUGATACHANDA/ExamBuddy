export const togglePasswordVisibility = (inputName) => {
    const pwdInput = document.querySelector(`input[name="${inputName}"]`);
    if (pwdInput) {
        pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
    }
};