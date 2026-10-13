import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../features/auth/presentation/controllers/auth_controller.dart';
import '../../features/auth/presentation/pages/admin_users_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/cash_register/presentation/pages/accounts_page.dart';
import '../../features/cash_register/presentation/pages/caja_page.dart';
import '../../features/dashboard/presentation/pages/dashboard_page.dart';
import '../../features/inventory/presentation/pages/barcodes_page.dart';
import '../../features/inventory/presentation/pages/inventory_page.dart';
import '../../features/operating_costs/presentation/pages/operating_costs_page.dart';
import '../../features/orders/presentation/pages/custom_orders_page.dart';
import '../../features/orders/presentation/pages/purchase_orders_page.dart';
import '../../features/pos/presentation/pages/sales_pos_page.dart';
import '../../features/price_management/presentation/pages/price_management_page.dart';
import '../../features/promotions/presentation/pages/promotions_page.dart';
import '../../features/reports/presentation/pages/reports_page.dart';
import '../config/constants.dart';
import '../theme/app_colors.dart';
import '../utils/ars_formatter.dart';
import '../utils/date_formatter.dart';
import '../widgets/adaptive_scaffold.dart';
import 'route_names.dart';

/// Configuración central de `GoRouter` con protección de rutas por autenticación y rol
/// (`Admin`, `Caja`, `Empleado`) y `ShellRoute` con `AdaptiveScaffold`.
final appRouterProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.watch(routerAuthNotifierProvider);

  return GoRouter(
    initialLocation: RouteNames.sales,
    refreshListenable: authNotifier,
    redirect: (context, state) {
      final authState = ref.read(authControllerProvider);
      if (authState.isInitializing) return null;

      final isLoggedIn = authState.isAuthenticated;
      final isGoingToLogin = state.matchedLocation == RouteNames.login;

      if (!isLoggedIn) {
        return isGoingToLogin ? null : RouteNames.login;
      }

      final user = authState.user!;

      if (isGoingToLogin) {
        return switch (user.role) {
          UserRole.admin => RouteNames.admin,
          UserRole.caja => RouteNames.caja,
          UserRole.empleado => RouteNames.sales,
        };
      }

      // Protección de ruta exclusiva Admin (/admin) idéntica a ProtectedRoute.jsx
      if (state.matchedLocation == RouteNames.admin && !user.isAdmin) {
        return user.isCaja ? RouteNames.caja : RouteNames.sales;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: RouteNames.login,
        builder: (context, state) => const LoginPage(),
      ),
      ShellRoute(
        builder: (context, state, child) {
          return AdaptiveScaffold(
            currentPath: state.matchedLocation,
            child: child,
          );
        },
        routes: [
          GoRoute(
            path: RouteNames.admin,
            builder: (context, state) => const AdminUsersPage(),
          ),
          GoRoute(
            path: RouteNames.dashboard,
            builder: (context, state) => const DashboardPage(),
          ),
          GoRoute(
            path: RouteNames.sales,
            builder: (context, state) => const SalesPosPage(),
          ),
          GoRoute(
            path: RouteNames.caja,
            builder: (context, state) => const CajaPage(),
          ),
          GoRoute(
            path: RouteNames.inventario,
            builder: (context, state) => const InventoryPage(),
          ),
          GoRoute(
            path: RouteNames.codigosBarra,
            builder: (context, state) => const BarcodesPage(),
          ),
          GoRoute(
            path: RouteNames.cuenta,
            builder: (context, state) => const AccountsPage(),
          ),
          GoRoute(
            path: RouteNames.precios,
            builder: (context, state) => const PriceManagementPage(),
          ),
          GoRoute(
            path: RouteNames.reports,
            builder: (context, state) => const ReportsPage(),
          ),
          GoRoute(
            path: RouteNames.costos,
            builder: (context, state) => const OperatingCostsPage(),
          ),
          GoRoute(
            path: RouteNames.promociones,
            builder: (context, state) => const PromotionsPage(),
          ),
          GoRoute(
            path: RouteNames.encargos,
            builder: (context, state) => const CustomOrdersPage(),
          ),
          GoRoute(
            path: RouteNames.pedidos,
            builder: (context, state) => const PurchaseOrdersPage(),
          ),
          GoRoute(
            path: RouteNames.ajustes,
            builder: (context, state) => const _ModuleReadyOverviewCard(
              title: 'Ajustes de Terminal y Backups',
              subtitle:
                  'Configuración de impresora térmica (58mm/80mm), servidor API local y copias de seguridad.',
              icon: LucideIcons.settings,
              phaseLabel: 'Fase 1 / Fase 6',
            ),
          ),
        ],
      ),
    ],
  );
});

/// Vista informativa de estado de módulo mientras avanzamos incrementalmente por las fases.
/// Incluye demostración en vivo del formateador ARS (`$ 1.250,00`), fecha `DD/MM/YYYY HH:mm` y lector de barras.
class _ModuleReadyOverviewCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final String phaseLabel;

  const _ModuleReadyOverviewCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.phaseLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(icon, size: 36, color: AppColors.primary),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.successBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.successBorder),
                    ),
                    child: Text(
                      phaseLabel,
                      style: const TextStyle(
                        color: AppColors.success,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    subtitle,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 20),
                  const Divider(),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 16,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: [
                      Chip(
                        avatar: const Icon(LucideIcons.dollarSign, size: 15),
                        label: Text(
                          'Formato ARS: ${ArsFormatter.format(1250)}',
                        ),
                      ),
                      Chip(
                        avatar: const Icon(LucideIcons.calendar, size: 15),
                        label: Text(
                          'Fecha: ${AppDateFormatter.formatDateTime(DateTime.now())}',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
