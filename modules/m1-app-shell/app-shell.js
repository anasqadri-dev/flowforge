
function toggleTheme() {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
  showToast("Theme changed");
}

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.display = "block";
  setTimeout(function () {
    toast.style.display = "none";
  }, 3000);
}