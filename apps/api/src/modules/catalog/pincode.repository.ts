import type { Database as DatabaseType } from 'better-sqlite3';
import { getDb } from '../../db/client';
import type { Pincode } from '@lammart/shared';

interface PincodeRow {
  pincode: string;
  city: string | null;
  state: string | null;
  is_serviceable: number;
  delivery_days: number | null;
  base_charge: number;
  heavy_charge_per_unit: number;
  cod_allowed: number;
}

export class PincodeRepository {
  constructor(private customDb?: DatabaseType) {}

  private get db(): DatabaseType {
    return this.customDb || getDb();
  }

  /**
   * Finds pincode details for logistics & shipping rates.
   */
  findByPincode(pincode: string): Pincode | null {
    const row = this.db
      .prepare(
        `
        SELECT pincode, city, state, is_serviceable, delivery_days, base_charge, heavy_charge_per_unit, cod_allowed
        FROM pincodes
        WHERE pincode = ?
      `
      )
      .get(pincode) as PincodeRow | undefined;

    if (!row) return null;

    return {
      pincode: row.pincode,
      city: row.city || undefined,
      state: row.state || undefined,
      isServiceable: Boolean(row.is_serviceable),
      deliveryDays: row.delivery_days !== null ? row.delivery_days : undefined,
      baseCharge: row.base_charge,
      heavyChargePerUnit: row.heavy_charge_per_unit,
      codAllowed: Boolean(row.cod_allowed),
    };
  }
}
