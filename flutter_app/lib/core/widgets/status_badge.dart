import 'package:flutter/material.dart';
import '../config/constants.dart';
import '../theme/app_colors.dart';

/// Badge semántico reutilizable para roles de usuario (`admin`, `caja`, `empleado`) y estados operativos.
class RoleBadge extends StatelessWidget {
  final UserRole role;
  final bool compact;

  const RoleBadge({
    super.key,
    required this.role,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final (bgColor, textColor, borderColor) = switch (role) {
      UserRole.admin => (
          const Color(0xFFF3E8FF),
          const Color(0xFF7E22CE),
          const Color(0xFFD8B4FE),
        ),
      UserRole.caja => (
          AppColors.successBg,
          AppColors.success,
          AppColors.successBorder,
        ),
      UserRole.empleado => (
          AppColors.primaryLight,
          AppColors.primary,
          const Color(0xFF93C5FD),
        ),
    };

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 6 : 9,
        vertical: compact ? 2 : 3.5,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: borderColor),
      ),
      child: Text(
        compact ? role.value.toUpperCase() : role.label,
        style: TextStyle(
          color: textColor,
          fontSize: compact ? 10 : 11.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
