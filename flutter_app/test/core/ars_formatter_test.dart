import 'package:flutter_test/flutter_test.dart';
import 'package:stock_pos_app/core/utils/ars_formatter.dart';

void main() {
  group('ArsFormatter Tests', () {
    test('format() renders standard Argentine currency with decimals', () {
      final formatted = ArsFormatter.format(1250.0);
      // es_AR format: symbol $ followed by space, thousands separator . and decimal ,
      expect(formatted, contains('1.250,00'));
      expect(formatted, startsWith(r'$'));
    });

    test('format() without decimals rounds properly', () {
      final formatted = ArsFormatter.format(1250.75, showDecimals: false);
      expect(formatted, contains('1.251'));
    });

    test('format() handles null and NaN safely', () {
      expect(ArsFormatter.format(null), contains('0,00'));
      expect(ArsFormatter.format(double.nan), contains('0,00'));
      expect(ArsFormatter.format(double.infinity), contains('0,00'));
    });

    test('formatNumber() formats number without currency symbol', () {
      final formatted = ArsFormatter.formatNumber(15420.50, showDecimals: true);
      expect(formatted, equals('15.420,50'));
    });

    test('formatNumber() integer mode works', () {
      final formatted = ArsFormatter.formatNumber(15420.50, showDecimals: false);
      expect(formatted, equals('15.421'));
    });

    test('roundCash() rounds amounts to nearest \$100 (replicating roundCash)', () {
      // 2330 -> 2300
      expect(ArsFormatter.roundCash(2330), equals(2300.0));
      // 2350 -> 2400
      expect(ArsFormatter.roundCash(2350), equals(2400.0));
      // 2380 -> 2400
      expect(ArsFormatter.roundCash(2380), equals(2400.0));
      // 1000 -> 1000
      expect(ArsFormatter.roundCash(1000), equals(1000.0));
      // 0 or null -> 0
      expect(ArsFormatter.roundCash(0), equals(0.0));
      expect(ArsFormatter.roundCash(null), equals(0.0));
    });

    test('parse() parses Argentine string into numeric double', () {
      expect(ArsFormatter.parse(r'$ 1.250,50'), equals(1250.50));
      expect(ArsFormatter.parse('1.250,00'), equals(1250.0));
      expect(ArsFormatter.parse('500'), equals(500.0));
      expect(ArsFormatter.parse(''), equals(0.0));
    });
  });
}
