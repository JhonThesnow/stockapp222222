class OperatingExpenseEntity {
  final int id;
  final String date;
  final String description;
  final double amount;
  final bool isRecurring;
  final bool isPaid;
  final int? accountId;

  const OperatingExpenseEntity({
    required this.id,
    required this.date,
    required this.description,
    required this.amount,
    required this.isRecurring,
    required this.isPaid,
    this.accountId,
  });

  factory OperatingExpenseEntity.fromJson(Map<String, dynamic> json) {
    return OperatingExpenseEntity(
      id: (json['id'] as num?)?.toInt() ?? 0,
      date: json['date'] as String? ?? '',
      description: json['description'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      isRecurring: json['is_recurring'] == 1 || json['is_recurring'] == true,
      isPaid: json['is_paid'] == 1 || json['is_paid'] == true,
      accountId: (json['account_id'] as num?)?.toInt(),
    );
  }
}

class IncidenceRateEntity {
  final double totalExpenses;
  final double totalSales;
  final double incidenceRate; // percentage

  const IncidenceRateEntity({
    required this.totalExpenses,
    required this.totalSales,
    required this.incidenceRate,
  });

  factory IncidenceRateEntity.fromJson(Map<String, dynamic> json) {
    return IncidenceRateEntity(
      totalExpenses: (json['totalExpenses'] as num?)?.toDouble() ?? 0.0,
      totalSales: (json['totalSales'] as num?)?.toDouble() ?? 0.0,
      incidenceRate: (json['incidenceRate'] as num?)?.toDouble() ?? 0.0,
    );
  }

  factory IncidenceRateEntity.empty() => const IncidenceRateEntity(
        totalExpenses: 0.0,
        totalSales: 0.0,
        incidenceRate: 0.0,
      );
}
