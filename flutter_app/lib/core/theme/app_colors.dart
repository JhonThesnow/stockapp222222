import 'package:flutter/material.dart';

/// Paleta semántica de colores inspirada en el diseño original de STOCK (Slate + Blue + Indigo + Emerald)
/// con alto contraste optimizado para lectura rápida en mostrador (Light & Dark).
class AppColors {
  const AppColors._();

  // Brand Primary (Blue 600 / 500)
  static const Color primary = Color(0xFF2563EB);
  static const Color primaryHover = Color(0xFF1D4ED8);
  static const Color primaryLight = Color(0xFFDBEAFE);

  // General semantic aliases
  static const Color error = Color(0xFFE11D48);
  static const Color info = Color(0xFF0284C7);
  static const Color background = Color(0xFFF1F5F9);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color border = Color(0xFFE2E8F0);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textMuted = Color(0xFF94A3B8);

  // Panel Admin (Indigo 600)
  static const Color adminIndigo = Color(0xFF4F46E5);
  static const Color adminIndigoBg = Color(0xFFEEF2FF);
  static const Color adminIndigoDarkBg = Color(0xFF1E1B4B);

  // Caja / Efectivo / Éxito (Emerald 600)
  static const Color success = Color(0xFF059669);
  static const Color successBg = Color(0xFFECFDF5);
  static const Color successBorder = Color(0xFFA7F3D0);

  // Advertencias / Stock Bajo (Amber 600)
  static const Color warning = Color(0xFFD97706);
  static const Color warningBg = Color(0xFFFFFBEB);
  static const Color warningBorder = Color(0xFFFDE68A);

  // Peligro / Anulaciones / Egresos (Rose / Red 600)
  static const Color danger = Color(0xFFE11D48);
  static const Color dangerBg = Color(0xFFFFF1F2);
  static const Color dangerBorder = Color(0xFFFECDD3);

  // Superficies Light (Slate)
  static const Color lightBackground = Color(0xFFF1F5F9); // Slate 100
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceSubtle = Color(0xFFF8FAFC); // Slate 50
  static const Color lightBorder = Color(0xFFE2E8F0); // Slate 200
  static const Color lightTextPrimary = Color(0xFF0F172A); // Slate 900
  static const Color lightTextSecondary = Color(0xFF475569); // Slate 600
  static const Color lightTextMuted = Color(0xFF94A3B8); // Slate 400

  // Sidebar Oscura (fiel a `bg-gray-800` / `slate-900` del diseño original)
  static const Color sidebarBg = Color(0xFF1E293B); // Slate 800
  static const Color sidebarCardBg = Color(0xFF334155); // Slate 700
  static const Color sidebarActiveItem = Color(0xFF374151);

  // Superficies Dark (Slate 950 / 900)
  static const Color darkBackground = Color(0xFF020617); // Slate 950
  static const Color darkSurface = Color(0xFF0F172A); // Slate 900
  static const Color darkSurfaceElevated = Color(0xFF1E293B); // Slate 800
  static const Color darkBorder = Color(0xFF334155); // Slate 700
  static const Color darkTextPrimary = Color(0xFFF8FAFC); // Slate 50
  static const Color darkTextSecondary = Color(0xFFCBD5E1); // Slate 300
  static const Color darkTextMuted = Color(0xFF64748B); // Slate 500
}
