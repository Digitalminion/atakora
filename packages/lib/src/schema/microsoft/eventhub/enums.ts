/**
 * Enums for Azure Event Hub (Microsoft.EventHub).
 *
 * @remarks
 * Curated enums for Azure Event Hub resources including namespaces and event hubs.
 *
 * **Resource Types**:
 * - Microsoft.EventHub/namespaces
 * - Microsoft.EventHub/namespaces/eventhubs
 *
 * **API Version**: 2021-11-01
 *
 * @packageDocumentation
 */

// Event Hub enums

/**
 * Event Hub capture encoding format.
 */
export enum CaptureEncoding {
  /**
   * Apache Avro format.
   */
  AVRO = 'Avro',

  /**
   * Avro with deflate compression.
   */
  AVRO_DEFLATE = 'AvroDeflate',
}
