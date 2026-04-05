import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

const THEME_KEY = "progress_track_theme_mode";
const LANGUAGE_KEY = "progress_track_language_mode";

const EN_FR_PAIRS = [
  ["Student Registration", "Inscription des Etudiants"],
  ["Teacher Registration", "Inscription des Enseignants"],
  ["Subject Management", "Gestion des Matieres"],
  ["Filter Students By Class", "Filtrer les Etudiants par Classe"],
  ["Filter Teachers", "Filtrer les Enseignants"],
  ["Filter Subjects", "Filtrer les Matieres"],
  ["Filter Students", "Filtrer les Etudiants"],
  ["Filter Teachers By Class", "Filtrer les Enseignants par Classe"],
  ["Filter", "Filtrer"],
  ["By Class", "par Classe"],
  ["Register Student", "Enregistrer Etudiant"],
  ["Register Teacher", "Enregistrer Enseignant"],
  ["Register and manage students by class using level/program/faculty filters.", "Enregistrer et gerer les etudiants par classe avec les filtres niveau/programme/faculte."],
  ["Register and manage teachers by class using faculty/department filters.", "Enregistrer et gerer les enseignants par classe avec les filtres faculte/departement."],
  ["Register and manage subjects by faculty/department filters.", "Enregistrer et gerer les matieres avec les filtres faculte/departement."],
  ["Fill one long form and scroll up/down to review all fields before saving.", "Remplissez un long formulaire et faites defiler pour verifier tous les champs avant d'enregistrer."],
  ["Add Subject", "Ajouter Matiere"],
  ["Add Row", "Ajouter Ligne"],
  ["Assign Classes and Subjects", "Assigner Classes et Matieres"],
  ["No subject available", "Aucune matiere disponible"],
  ["No subjects found", "Aucune matiere trouvee"],
  ["No teachers found", "Aucun enseignant trouve"],
  ["No students found", "Aucun etudiant trouve"],
  ["No courses found", "Aucun cours trouve"],
  ["No data found", "Aucune donnee trouvee"],
  ["No notifications yet", "Aucune notification pour le moment"],
  ["Refresh", "Actualiser"],
  ["Export", "Exporter"],
  ["Dashboard", "Tableau de Bord"],
  ["Dashboard Overview", "Apercu du Tableau de Bord"],
  ["Performance Snapshot", "Apercu des Performances"],
  ["Students", "Etudiants"],
  ["Teachers", "Enseignants"],
  ["Subjects", "Matieres"],
  ["My Courses", "Mes Cours"],
  ["Result", "Resultat"],
  ["Results", "Resultats"],
  ["Summary", "Resume"],
  ["Exams", "Examens"],
  ["Unvalidated", "Non Valides"],
  ["Attendance", "Presence"],
  ["Reports", "Rapports"],
  ["Inbox", "Messages"],
  ["Settings", "Parametres"],
  ["Notifications", "Notifications"],
  ["This Week", "Cette Semaine"],
  ["Today", "Aujourd'hui"],
  ["User", "Utilisateur"],
  ["Administrator", "Administrateur"],
  ["Logout", "Deconnexion"],
  ["Search", "Rechercher"],
  ["Search name/matricule", "Rechercher nom/matricule"],
  ["Search subject name/code", "Rechercher nom/code matiere"],
  ["Search teacher, class, or subject", "Rechercher enseignant, classe ou matiere"],
  ["All Faculties", "Toutes les Facultes"],
  ["All Departments", "Tous les Departements"],
  ["All Programs", "Tous les Programmes"],
  ["All Levels", "Tous les Niveaux"],
  ["All Employment Types", "Tous les Types d'Emploi"],
  ["All Status", "Tous les Statuts"],
  ["All Subjects", "Toutes les Matieres"],
  ["All Teachers", "Tous les Enseignants"],
  ["All Students", "Tous les Etudiants"],
  ["Select Faculty", "Selectionner Faculte"],
  ["Select Department", "Selectionner Departement"],
  ["Select Subject", "Selectionner Matiere"],
  ["Select Class", "Selectionner Classe"],
  ["Select Program", "Selectionner Programme"],
  ["Select Level", "Selectionner Niveau"],
  ["Select Status", "Selectionner Statut"],
  ["Employment", "Emploi"],
  ["Part-Time", "Temps Partiel"],
  ["Full-Time", "Temps Plein"],
  ["Name", "Nom"],
  ["Code", "Code"],
  ["Faculty", "Faculte"],
  ["Department", "Departement"],
  ["Program", "Programme"],
  ["Level", "Niveau"],
  ["Status", "Statut"],
  ["Actions", "Actions"],
  ["All Status", "Tous les Statuts"],
  ["Active", "Actif"],
  ["Inactive", "Inactif"],
  ["Cancel", "Annuler"],
  ["Save", "Enregistrer"],
  ["Save Changes", "Enregistrer les Modifications"],
  ["Saving...", "Enregistrement..."],
  ["Loading...", "Chargement..."],
  ["Loading subjects from backend...", "Chargement des matieres depuis le backend..."],
  ["Delete", "Supprimer"],
  ["Delete Subject", "Supprimer Matiere"],
  ["Edit", "Modifier"],
  ["Light", "Clair"],
  ["Dark", "Sombre"],
  ["English", "Anglais"],
  ["French", "Francais"],
  ["Language", "Langue"],
  ["Theme", "Theme"],
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const translateText = (text, pairs) => {
  let output = text;
  for (const [from, to] of pairs) {
    output = output.replace(new RegExp(escapeRegExp(from), "gi"), to);
  }
  return output;
};

const ensureDarkThemeStyles = () => {
  if (typeof document === "undefined") return;

  if (document.getElementById("progress-track-dark-theme")) return;

  const style = document.createElement("style");
  style.id = "progress-track-dark-theme";
  style.textContent = `
    html.app-dark, html.app-dark body, html.app-dark #root {
      background: #1f2937 !important;
      color: #e5e7eb !important;
    }
    html.app-dark .bg-white { background-color: #263445 !important; }
    html.app-dark .bg-gray-50, html.app-dark .bg-gray-100 { background-color: #223244 !important; }
    html.app-dark .text-gray-900 { color: #f9fafb !important; }
    html.app-dark .text-gray-800 { color: #e5e7eb !important; }
    html.app-dark .text-gray-700 { color: #d1d5db !important; }
    html.app-dark .text-gray-600, html.app-dark .text-gray-500, html.app-dark .text-gray-400 {
      color: #b6c2d3 !important;
    }
    html.app-dark .border-gray-100, html.app-dark .border-gray-200, html.app-dark .border-gray-300 {
      border-color: #4b5d73 !important;
    }
    html.app-dark .shadow-sm, html.app-dark .shadow, html.app-dark .shadow-md, html.app-dark .shadow-lg,
    html.app-dark .shadow-xl, html.app-dark .shadow-2xl {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22) !important;
    }
    html.app-dark input, html.app-dark select, html.app-dark textarea {
      background-color: #1f2c3d !important;
      color: #e2e8f0 !important;
      border-color: #4b5d73 !important;
    }
    html.app-dark table, html.app-dark thead, html.app-dark tbody, html.app-dark tr, html.app-dark td, html.app-dark th {
      border-color: #4b5d73 !important;
    }
    html.app-dark .bg-red-50 { background-color: rgba(127, 29, 29, 0.3) !important; }
    html.app-dark .text-red-600, html.app-dark .text-red-700 { color: #fca5a5 !important; }
    html.app-dark .bg-green-100 { background-color: rgba(6, 78, 59, 0.45) !important; }
    html.app-dark .text-green-700 { color: #86efac !important; }
  `;

  document.head.appendChild(style);
};

const getInitialValue = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) || fallback;
};

export default function Settings() {
  const [themeMode, setThemeMode] = useState(() => getInitialValue(THEME_KEY, "light"));
  const [languageMode, setLanguageMode] = useState(() => getInitialValue(LANGUAGE_KEY, "english"));

  const textNodeOriginalRef = useRef(new WeakMap());
  const placeholderOriginalRef = useRef(new WeakMap());
  const titleOriginalRef = useRef(new WeakMap());
  const ariaLabelOriginalRef = useRef(new WeakMap());
  const observerRef = useRef(null);

  const frEnPairs = useMemo(() => EN_FR_PAIRS.map(([en, fr]) => [fr, en]), []);

  const translateDom = useCallback((toLanguage) => {
    if (typeof document === "undefined") return;

    const isFrench = toLanguage === "french";
    const translationPairs = isFrench ? EN_FR_PAIRS : frEnPairs;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!node?.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
          const parentTag = node.parentElement?.tagName;
          if (!parentTag) return NodeFilter.FILTER_ACCEPT;
          if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(parentTag)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      if (!textNodeOriginalRef.current.has(node)) {
        textNodeOriginalRef.current.set(node, node.nodeValue);
      }

      if (isFrench) {
        const original = textNodeOriginalRef.current.get(node) || node.nodeValue || "";
        node.nodeValue = translateText(original, translationPairs);
      } else {
        const original = textNodeOriginalRef.current.get(node);
        if (original != null) node.nodeValue = original;
      }
    });

    document.querySelectorAll("[placeholder]").forEach((element) => {
      if (!placeholderOriginalRef.current.has(element)) {
        placeholderOriginalRef.current.set(element, element.getAttribute("placeholder") || "");
      }
      const originalPlaceholder = placeholderOriginalRef.current.get(element) || "";
      element.setAttribute(
        "placeholder",
        isFrench ? translateText(originalPlaceholder, translationPairs) : originalPlaceholder
      );
    });

    document.querySelectorAll("[title]").forEach((element) => {
      if (!titleOriginalRef.current.has(element)) {
        titleOriginalRef.current.set(element, element.getAttribute("title") || "");
      }
      const originalTitle = titleOriginalRef.current.get(element) || "";
      element.setAttribute(
        "title",
        isFrench ? translateText(originalTitle, translationPairs) : originalTitle
      );
    });

    document.querySelectorAll("[aria-label]").forEach((element) => {
      if (!ariaLabelOriginalRef.current.has(element)) {
        ariaLabelOriginalRef.current.set(element, element.getAttribute("aria-label") || "");
      }
      const originalAriaLabel = ariaLabelOriginalRef.current.get(element) || "";
      element.setAttribute(
        "aria-label",
        isFrench ? translateText(originalAriaLabel, translationPairs) : originalAriaLabel
      );
    });
  }, [frEnPairs]);

  useEffect(() => {
    ensureDarkThemeStyles();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.classList.toggle("app-dark", themeMode === "dark");
    document.documentElement.style.colorScheme = themeMode === "dark" ? "dark" : "light";

    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_KEY, themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.lang = languageMode === "french" ? "fr" : "en";

    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_KEY, languageMode);
    }

    translateDom(languageMode);

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    let frameId = null;
    if (languageMode === "french") {
      observerRef.current = new MutationObserver(() => {
        if (frameId != null) return;
        frameId = window.requestAnimationFrame(() => {
          frameId = null;
          translateDom("french");
        });
      });
      observerRef.current.observe(document.getElementById("root") || document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (frameId != null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [languageMode, translateDom]);

  const toggleTheme = () => {
    const next = themeMode === "dark" ? "light" : "dark";
    setThemeMode(next);
    toast.success(`Theme switched to ${next}.`);
  };

  const toggleLanguage = () => {
    const next = languageMode === "french" ? "english" : "french";
    setLanguageMode(next);
    toast.success(`Language switched to ${next}.`);
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500">Manage your system preferences.</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-800">Theme</p>
            <p className="text-sm text-gray-500">Toggle between Light and Dark theme.</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition ${
              themeMode === "dark" ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                themeMode === "dark" ? "translate-x-9" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <hr />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-800">Language</p>
            <p className="text-sm text-gray-500">Toggle between English and French.</p>
          </div>
          <button
            type="button"
            onClick={toggleLanguage}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition ${
              languageMode === "french" ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                languageMode === "french" ? "translate-x-9" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
