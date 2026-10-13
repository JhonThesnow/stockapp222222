import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../features/auth/presentation/controllers/auth_controller.dart';
import '../config/constants.dart';
import '../router/route_names.dart';
import '../scanner/desktop_wedge_listener.dart';
import '../scanner/scanner_dispatcher.dart';
import '../shortcuts/pos_shortcuts.dart';
import '../theme/app_colors.dart';
import '../theme/theme_controller.dart';
import 'scanner_fab.dart';
import 'status_badge.dart';

/// Destino de navegación del sistema POS.
class NavDestinationItem {
  final String route;
  final String label;
  final IconData icon;
  final bool adminOnly;

  const NavDestinationItem({
    required this.route,
    required this.label,
    required this.icon,
    this.adminOnly = false,
  });
}

/// Lista completa de módulos replicando exactamente `Navigation` en `src/App.jsx`.
const List<NavDestinationItem> kAllNavItems = [
  NavDestinationItem(
    route: RouteNames.admin,
    label: 'Panel Admin',
    icon: LucideIcons.shield,
    adminOnly: true,
  ),
  NavDestinationItem(
    route: RouteNames.dashboard,
    label: 'Principal',
    icon: LucideIcons.house,
  ),
  NavDestinationItem(
    route: RouteNames.sales,
    label: 'Ventas (POS)',
    icon: LucideIcons.shoppingCart,
  ),
  NavDestinationItem(
    route: RouteNames.caja,
    label: 'Caja',
    icon: LucideIcons.dollarSign,
  ),
  NavDestinationItem(
    route: RouteNames.inventario,
    label: 'Inventario',
    icon: LucideIcons.box,
  ),
  NavDestinationItem(
    route: RouteNames.codigosBarra,
    label: 'Códigos & Etiquetas',
    icon: LucideIcons.tag,
  ),
  NavDestinationItem(
    route: RouteNames.cuenta,
    label: 'Cuenta / Bolsillos',
    icon: LucideIcons.wallet,
  ),
  NavDestinationItem(
    route: RouteNames.precios,
    label: 'Sinc. Precios',
    icon: LucideIcons.refreshCw,
  ),
  NavDestinationItem(
    route: RouteNames.reports,
    label: 'Reportes & ARCA',
    icon: LucideIcons.chartBar,
  ),
  NavDestinationItem(
    route: RouteNames.costos,
    label: 'Costos',
    icon: LucideIcons.calculator,
  ),
  NavDestinationItem(
    route: RouteNames.promociones,
    label: 'Promociones',
    icon: LucideIcons.star,
  ),
  NavDestinationItem(
    route: RouteNames.encargos,
    label: 'Encargos',
    icon: LucideIcons.clipboardList,
  ),
  NavDestinationItem(
    route: RouteNames.pedidos,
    label: 'Pedidos',
    icon: LucideIcons.truck,
  ),
  NavDestinationItem(
    route: RouteNames.ajustes,
    label: 'Ajustes',
    icon: LucideIcons.settings,
  ),
];

/// Layout Base Adaptativo (`AdaptiveScaffold`):
/// - **Desktop (>= 768px)**: Sidebar colapsable de alta densidad (`w-64` / `w-20`) con tarjeta de usuario,
///   rol, selector de tema Light/Dark, atajos `F12` Caja y listener global de código de barras USB.
/// - **Mobile (< 768px)**: `BottomNavigationBar` ergonómica (Caja, Stock, Costos, Ventas, Menú desplegable)
///   + `ScannerFab` flotante para lectura con cámara.
class AdaptiveScaffold extends ConsumerStatefulWidget {
  final Widget child;
  final String currentPath;

  const AdaptiveScaffold({
    super.key,
    required this.child,
    required this.currentPath,
  });

  @override
  ConsumerState<AdaptiveScaffold> createState() => _AdaptiveScaffoldState();
}

class _AdaptiveScaffoldState extends ConsumerState<AdaptiveScaffold> {
  bool _isSidebarCollapsed = false;

  void _openMobileMoreMenu(BuildContext context, bool isAdmin) {
    final visibleItems = kAllNavItems
        .where((item) => !item.adminOnly || isAdmin)
        .toList();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 42,
                height: 4,
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: Colors.grey.shade400,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: visibleItems.length,
                  itemBuilder: (_, idx) {
                    final item = visibleItems[idx];
                    final isSelected = widget.currentPath == item.route;
                    return ListTile(
                      dense: true,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      selected: isSelected,
                      selectedTileColor: AppColors.primary.withValues(alpha: 0.12),
                      leading: Icon(
                        item.icon,
                        color: item.adminOnly
                            ? AppColors.adminIndigo
                            : (isSelected ? AppColors.primary : null),
                      ),
                      title: Text(
                        item.label,
                        style: TextStyle(
                          fontWeight:
                              isSelected ? FontWeight.w700 : FontWeight.w500,
                        ),
                      ),
                      onTap: () {
                        Navigator.of(ctx).pop();
                        context.go(item.route);
                      },
                    );
                  },
                ),
              ),
              const Divider(height: 16),
              ListTile(
                dense: true,
                leading: const Icon(LucideIcons.logOut, color: AppColors.danger),
                title: const Text(
                  'Cerrar Sesión',
                  style: TextStyle(
                    color: AppColors.danger,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                onTap: () async {
                  Navigator.of(ctx).pop();
                  await ref.read(authControllerProvider.notifier).logout();
                  if (context.mounted) context.go(RouteNames.login);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Escucha eventos globales del escáner y muestra feedback visual inmediato
    ref.listen<BarcodeScanEvent?>(scannerDispatcherProvider, (prev, next) {
      if (next == null) return;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          width: 420,
          duration: const Duration(seconds: 2),
          backgroundColor: AppColors.sidebarBg,
          content: Row(
            children: [
              const Icon(LucideIcons.scanBarcode, color: Colors.white, size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Código leído: ${next.barcode}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    });

    final width = MediaQuery.sizeOf(context).width;
    final isMobile = width < AppConstants.mobileMaxWidth;
    final authState = ref.watch(authControllerProvider);
    final user = authState.user;
    final isAdmin = user?.isAdmin ?? false;
    final themeMode = ref.watch(themeModeProvider);

    return DesktopWedgeScannerListener(
      currentRoutePath: widget.currentPath,
      child: PosKeyboardShortcuts(
        onNavigateCaja: () => context.go(RouteNames.caja),
        child: Scaffold(
          body: Row(
            children: [
              if (!isMobile)
                _DesktopSidebar(
                  currentPath: widget.currentPath,
                  isCollapsed: _isSidebarCollapsed,
                  onToggleCollapse: () => setState(
                    () => _isSidebarCollapsed = !_isSidebarCollapsed,
                  ),
                  isAdmin: isAdmin,
                  themeMode: themeMode,
                  onToggleTheme: () =>
                      ref.read(themeModeProvider.notifier).toggleTheme(),
                ),
              Expanded(
                child: Column(
                  children: [
                    if (isMobile)
                      _MobileTopBar(
                        themeMode: themeMode,
                        onToggleTheme: () =>
                            ref.read(themeModeProvider.notifier).toggleTheme(),
                      ),
                    Expanded(child: widget.child),
                  ],
                ),
              ),
            ],
          ),
          floatingActionButton: isMobile
              ? ScannerFab(currentRoutePath: widget.currentPath)
              : null,
          bottomNavigationBar: isMobile
              ? _MobileBottomNav(
                  currentPath: widget.currentPath,
                  onOpenMenu: () => _openMobileMoreMenu(context, isAdmin),
                )
              : null,
        ),
      ),
    );
  }
}

class _DesktopSidebar extends ConsumerWidget {
  final String currentPath;
  final bool isCollapsed;
  final VoidCallback onToggleCollapse;
  final bool isAdmin;
  final ThemeMode themeMode;
  final VoidCallback onToggleTheme;

  const _DesktopSidebar({
    required this.currentPath,
    required this.isCollapsed,
    required this.onToggleCollapse,
    required this.isAdmin,
    required this.themeMode,
    required this.onToggleTheme,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final visibleItems = kAllNavItems
        .where((item) => !item.adminOnly || isAdmin)
        .toList();

    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: isCollapsed ? 76 : 252,
      color: AppColors.sidebarBg,
      child: SafeArea(
        child: Column(
          children: [
            // Cabecera de marca STOCK + botón colapsar
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 12, 12),
              child: Row(
                mainAxisAlignment: isCollapsed
                    ? MainAxisAlignment.center
                    : MainAxisAlignment.spaceBetween,
                children: [
                  if (!isCollapsed)
                    const Row(
                      children: [
                        Icon(
                          LucideIcons.boxes,
                          color: Color(0xFF60A5FA),
                          size: 24,
                        ),
                        SizedBox(width: 10),
                        Text(
                          AppConstants.appName,
                          style: TextStyle(
                            color: Color(0xFF60A5FA),
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ],
                    ),
                  IconButton(
                    tooltip: isCollapsed ? 'Expandir menú' : 'Colapsar menú',
                    onPressed: onToggleCollapse,
                    icon: Icon(
                      isCollapsed
                          ? LucideIcons.panelLeftOpen
                          : LucideIcons.panelLeftClose,
                      color: Colors.white70,
                      size: 19,
                    ),
                  ),
                ],
              ),
            ),

            // Tarjeta de sesión activa (idéntica a Navigation en App.jsx)
            if (user != null && !isCollapsed)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.sidebarCardBg.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white12),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Sesión iniciada',
                            style: TextStyle(
                              color: Colors.white60,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            user.displayName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 13.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          RoleBadge(role: user.role, compact: true),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Cambiar tema Claro/Oscuro',
                      onPressed: onToggleTheme,
                      icon: Icon(
                        themeMode == ThemeMode.dark
                            ? LucideIcons.sun
                            : LucideIcons.moon,
                        color: Colors.white70,
                        size: 18,
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 6),

            // Lista de Navegación
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                itemCount: visibleItems.length,
                separatorBuilder: (_, __) => const SizedBox(height: 3),
                itemBuilder: (context, idx) {
                  final item = visibleItems[idx];
                  final isSelected = currentPath == item.route;

                  final bgColor = isSelected
                      ? (item.adminOnly
                          ? AppColors.adminIndigo
                          : AppColors.sidebarActiveItem)
                      : (item.adminOnly
                          ? AppColors.adminIndigoDarkBg.withValues(alpha: 0.55)
                          : Colors.transparent);

                  return Material(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(10),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: () => context.go(item.route),
                      child: Padding(
                        padding: EdgeInsets.symmetric(
                          horizontal: isCollapsed ? 0 : 12,
                          vertical: 11,
                        ),
                        child: Row(
                          mainAxisAlignment: isCollapsed
                              ? MainAxisAlignment.center
                              : MainAxisAlignment.start,
                          children: [
                            Icon(
                              item.icon,
                              size: 19,
                              color: isSelected
                                  ? Colors.white
                                  : (item.adminOnly
                                      ? const Color(0xFFA5B4FC)
                                      : Colors.white70),
                            ),
                            if (!isCollapsed) ...[
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  item.label,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: isSelected
                                        ? Colors.white
                                        : Colors.white.withValues(alpha: 0.85),
                                    fontSize: 13.5,
                                    fontWeight: isSelected
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            // Footer: Cerrar sesión
            const Divider(color: Colors.white12, height: 1),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () async {
                    await ref.read(authControllerProvider.notifier).logout();
                    if (context.mounted) context.go(RouteNames.login);
                  },
                  child: Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: isCollapsed ? 0 : 12,
                      vertical: 11,
                    ),
                    child: Row(
                      mainAxisAlignment: isCollapsed
                          ? MainAxisAlignment.center
                          : MainAxisAlignment.start,
                      children: [
                        const Icon(
                          LucideIcons.logOut,
                          color: Color(0xFFFCA5A5),
                          size: 19,
                        ),
                        if (!isCollapsed) ...[
                          const SizedBox(width: 12),
                          const Text(
                            'Cerrar Sesión',
                            style: TextStyle(
                              color: Color(0xFFFCA5A5),
                              fontWeight: FontWeight.w600,
                              fontSize: 13.5,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MobileTopBar extends ConsumerWidget {
  final ThemeMode themeMode;
  final VoidCallback onToggleTheme;

  const _MobileTopBar({
    required this.themeMode,
    required this.onToggleTheme,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;

    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Row(
              children: [
                Icon(LucideIcons.boxes, color: AppColors.primary, size: 20),
                SizedBox(width: 8),
                Text(
                  AppConstants.appName,
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 17,
                    letterSpacing: 1.1,
                  ),
                ),
              ],
            ),
            Row(
              children: [
                if (user != null) RoleBadge(role: user.role, compact: true),
                const SizedBox(width: 6),
                IconButton(
                  onPressed: onToggleTheme,
                  icon: Icon(
                    themeMode == ThemeMode.dark
                        ? LucideIcons.sun
                        : LucideIcons.moon,
                    size: 18,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Barra inferior Mobile idéntica a `src/components/BottomNav.jsx`:
/// Caja, Stock, Costos, Ventas y Menú.
class _MobileBottomNav extends StatelessWidget {
  final String currentPath;
  final VoidCallback onOpenMenu;

  const _MobileBottomNav({
    required this.currentPath,
    required this.onOpenMenu,
  });

  int _resolveIndex() {
    return switch (currentPath) {
      RouteNames.caja => 0,
      RouteNames.inventario => 1,
      RouteNames.costos => 2,
      RouteNames.sales => 3,
      _ => 4,
    };
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _resolveIndex();

    return NavigationBar(
      height: 64,
      selectedIndex: selectedIndex,
      onDestinationSelected: (idx) {
        switch (idx) {
          case 0:
            context.go(RouteNames.caja);
          case 1:
            context.go(RouteNames.inventario);
          case 2:
            context.go(RouteNames.costos);
          case 3:
            context.go(RouteNames.sales);
          case 4:
            onOpenMenu();
        }
      },
      destinations: const [
        NavigationDestination(
          icon: Icon(LucideIcons.dollarSign),
          label: 'Caja',
        ),
        NavigationDestination(
          icon: Icon(LucideIcons.box),
          label: 'Stock',
        ),
        NavigationDestination(
          icon: Icon(LucideIcons.calculator),
          label: 'Costos',
        ),
        NavigationDestination(
          icon: Icon(LucideIcons.shoppingCart),
          label: 'Ventas',
        ),
        NavigationDestination(
          icon: Icon(LucideIcons.menu),
          label: 'Menú',
        ),
      ],
    );
  }
}
