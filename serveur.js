require("dotenv").config();
const express = require("express");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "secret";

const storage = multer.diskStorage({
  destination: "public/uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

const loadData = (file) => {
  const filePath = `data/${file}.json`;
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]");
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const saveData = (file, data) => {
  fs.writeFileSync(`data/${file}.json`, JSON.stringify(data, null, 2));
};

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

app.post("/register", async (req, res) => {
  try {
    let users = loadData("users");
    const { username, password } = req.body;

    if (!username || !password) return res.status(400).json({ error: "Tous les champs sont requis" });

    if (users.find((u) => u.username === username)) {
      return res.status(400).json({ error: "Utilisateur déjà existant" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    saveData("users", users);

    res.status(201).json({ message: "Utilisateur enregistré avec succès" });
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    let users = loadData("users");

    const user = users.find((u) => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Identifiants invalides" });
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Connexion réussie", token });
  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

app.post("/add-object", upload.single("image"), (req, res) => {
  try {
      if (!req.body.name || !req.body.description || !req.body.date || !req.body.location || !req.body.username) {
        return res.status(400).json({ error: "Tous les champs sont requis." });
      }

      let objects = loadData("objects");
      const { name, description, date, location, username } = req.body;
      const imageUrl = `../public/uploads/${req.file.filename}`;

      const newObject = { name, description, date, location, imageUrl, username, status: "pending" };
      objects.push(newObject);
      saveData("objects", objects);

      const safeFileName = name.toLowerCase().replace(/\s+/g, "_") + ".html";
      const filePath = path.join(__dirname, "views", safeFileName);

      let htmlContent = `<!DOCTYPE html>
      <html lang="fr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${name}</title>
          <link rel="stylesheet" href="style.css">
      </head>
      <body>
          <div class="container">
              <h1>${name}</h1>
              <div class="object-card">
                  <img src="${imageUrl}" alt="${name}">
                  <div class="object-details">
                      <p><strong>Description :</strong> ${description}</p>
                      <p><strong>Lieu trouvé :</strong> ${location}</p>
                      <p><strong>Date :</strong> ${date}</p>
                      <p><strong>Ajouté par :</strong> ${username}</p>
                  </div>
              </div>
              <a href="../public/index.html" class="back-button">Retour à l'accueil</a>
          </div>
      </body>
      </html>`;

      fs.writeFile(filePath, htmlContent, (err) => {
          if (err) {
            console.error("Erreur lors de la création du fichier HTML :", err);
            return res.status(500).json({ error: "Erreur lors de la génération du fichier HTML." });
          }

          res.json({ message: "Objet ajouté et page créée !", object: newObject, page: safeFileName });
      });

  } catch (error) {
    console.error("Erreur lors de l'ajout de l'objet :", error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

app.get("/get-objects", (req, res) => {
  try {
    let objects = loadData("objects");
    res.json(objects);
  } catch (error) {
    console.error("Erreur lors de la récupération des objets :", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

app.listen(3000, () => console.log("Serveur sur http://localhost:3000"));