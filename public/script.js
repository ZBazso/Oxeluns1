function showMessage() {
  const output = document.getElementById('output');
  const messages = [
    "Hey there! 👋",
    "Yes, JavaScript works!",
    "You're building a real site!",
    "Click power 💥",
    "Hello from the JS console!"
  ];
  output.innerText = messages[Math.floor(Math.random() * messages.length)];
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

window.onload = () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
  }

  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      document.getElementById('formStatus').innerText = result.message;
      form.reset();
    });
  }
}
