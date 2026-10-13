import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../core/config/constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/confirm_dialog.dart';
import '../../../../core/widgets/status_badge.dart';
import '../controllers/auth_controller.dart';

/// Panel de Administración de Usuarios y Permisos (`GET / POST / DELETE /api/users`).
/// Replica la gestión de cuentas de empleados de `src/pages/AdminPage.jsx`.
class AdminUsersPage extends ConsumerWidget {
  const AdminUsersPage({super.key});

  Future<void> _showCreateEmployeeDialog(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final nameCtrl = TextEditingController();
    final usernameCtrl = TextEditingController();
    final passwordCtrl = TextEditingController();
    UserRole selectedRole = UserRole.empleado;
    final formKey = GlobalKey<FormState>();

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          title: const Row(
            children: [
              Icon(LucideIcons.userPlus, color: AppColors.primary, size: 20),
              SizedBox(width: 10),
              Text('Nuevo Empleado / Usuario'),
            ],
          ),
          content: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Nombre Completo',
                      hintText: 'Ej: Martín Gómez',
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: usernameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Nombre de Usuario',
                      hintText: 'Ej: mgomez',
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: passwordCtrl,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Contraseña',
                    ),
                    validator: (v) => (v == null || v.length < 4)
                        ? 'Mínimo 4 caracteres'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<UserRole>(
                    initialValue: selectedRole,
                    decoration: const InputDecoration(labelText: 'Rol en el Sistema'),
                    items: UserRole.values
                        .map(
                          (role) => DropdownMenuItem(
                            value: role,
                            child: Text(role.label),
                          ),
                        )
                        .toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() => selectedRole = val);
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
          actions: [
            OutlinedButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                final err = await ref
                    .read(adminUsersControllerProvider.notifier)
                    .createUser(
                      username: usernameCtrl.text,
                      name: nameCtrl.text,
                      password: passwordCtrl.text,
                      role: selectedRole,
                    );
                if (!ctx.mounted) return;
                if (err != null) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    SnackBar(
                      content: Text(err),
                      backgroundColor: AppColors.danger,
                    ),
                  );
                } else {
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Usuario creado exitosamente'),
                      backgroundColor: AppColors.success,
                    ),
                  );
                }
              },
              child: const Text('Crear Usuario'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usersAsync = ref.watch(adminUsersControllerProvider);
    final currentUser = ref.watch(authControllerProvider).user;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 16,
                runSpacing: 12,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.adminIndigoBg,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          LucideIcons.shieldCheck,
                          color: AppColors.adminIndigo,
                          size: 26,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Panel de Administración',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Supervisa las cuentas de empleados, roles y permisos del punto de venta',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ],
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      OutlinedButton.icon(
                        onPressed: () => ref
                            .read(adminUsersControllerProvider.notifier)
                            .refreshUsers(),
                        icon: const Icon(LucideIcons.refreshCw, size: 16),
                        label: const Text('Actualizar'),
                      ),
                      const SizedBox(width: 10),
                      ElevatedButton.icon(
                        onPressed: () => _showCreateEmployeeDialog(context, ref),
                        icon: const Icon(LucideIcons.plus, size: 16),
                        label: const Text('Nuevo Empleado'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Tabla de Usuarios
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Cuentas y Empleados Registrados',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Control de acceso por rol (Administrador, Caja, Empleado)',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 16),
                  usersAsync.when(
                    loading: () => const Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (err, _) => Padding(
                      padding: const EdgeInsets.all(20),
                      child: Text(
                        'Error al cargar usuarios: $err',
                        style: const TextStyle(color: AppColors.danger),
                      ),
                    ),
                    data: (users) => SizedBox(
                      width: double.infinity,
                      child: DataTable(
                        headingRowColor: WidgetStatePropertyAll(
                          Theme.of(context).brightness == Brightness.dark
                              ? AppColors.darkSurfaceElevated
                              : AppColors.lightSurfaceSubtle,
                        ),
                        columns: const [
                          DataColumn(label: Text('NOMBRE')),
                          DataColumn(label: Text('USUARIO')),
                          DataColumn(label: Text('ROL')),
                          DataColumn(label: Text('FECHA ALTA')),
                          DataColumn(label: Text('ACCIÓN')),
                        ],
                        rows: users.map((u) {
                          final isCurrentUser = u.id == currentUser?.id;
                          return DataRow(
                            cells: [
                              DataCell(
                                Text(
                                  u.name,
                                  style: const TextStyle(fontWeight: FontWeight.w600),
                                ),
                              ),
                              DataCell(Text('@${u.username}')),
                              DataCell(RoleBadge(role: u.role)),
                              DataCell(
                                Text(AppDateFormatter.formatDateTime(u.createdAt)),
                              ),
                              DataCell(
                                isCurrentUser
                                    ? const Text(
                                        'Sesión actual',
                                        style: TextStyle(
                                          fontStyle: FontStyle.italic,
                                          fontSize: 12,
                                        ),
                                      )
                                    : IconButton(
                                        tooltip: 'Eliminar usuario',
                                        icon: const Icon(
                                          LucideIcons.trash2,
                                          color: AppColors.danger,
                                          size: 18,
                                        ),
                                        onPressed: () async {
                                          final confirmed = await ConfirmDialog.show(
                                            context,
                                            title: 'Eliminar Usuario',
                                            message:
                                                '¿Estás seguro de eliminar al usuario "@${u.username}"?',
                                            confirmLabel: 'Eliminar',
                                            isDestructive: true,
                                          );
                                          if (!confirmed) return;
                                          final err = await ref
                                              .read(
                                                adminUsersControllerProvider.notifier,
                                              )
                                              .deleteUser(u.id);
                                          if (err != null && context.mounted) {
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(
                                              SnackBar(
                                                content: Text(err),
                                                backgroundColor: AppColors.danger,
                                              ),
                                            );
                                          }
                                        },
                                      ),
                              ),
                            ],
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
