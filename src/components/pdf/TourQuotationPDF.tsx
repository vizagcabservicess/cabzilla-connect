import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { TourDetail } from '@/types/tour';

interface TourQuotationPDFProps {
  tour: TourDetail;
  pickupLocation: string;
  pickupDate: Date;
  vehicleFares: Array<{
    vehicleType: string;
    fare: number;
    seatingCapacity: number;
  }>;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: '#1a365d',
    color: 'white',
    padding: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  companyTagline: {
    fontSize: 12,
    opacity: 0.9,
  },
  tourTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 15,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    width: '30%',
    color: '#4a5568',
  },
  value: {
    fontSize: 12,
    width: '70%',
    color: '#2d3748',
  },
  description: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#4a5568',
    textAlign: 'justify',
  },
  listItem: {
    fontSize: 11,
    marginBottom: 4,
    paddingLeft: 15,
    color: '#4a5568',
  },
  vehicleTable: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f7fafc',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2d3748',
    flex: 1,
    textAlign: 'center',
  },
  tableCell: {
    fontSize: 11,
    color: '#4a5568',
    flex: 1,
    textAlign: 'center',
  },
  priceCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a365d',
    flex: 1,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 15,
  },
  contactInfo: {
    fontSize: 10,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 5,
  },
  disclaimer: {
    fontSize: 9,
    color: '#718096',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  itineraryDay: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 5,
  },
  dayDescription: {
    fontSize: 11,
    color: '#4a5568',
    lineHeight: 1.4,
  },
});

export const TourQuotationPDF: React.FC<TourQuotationPDFProps> = ({
  tour,
  pickupLocation,
  pickupDate,
  vehicleFares,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>VizagTours</Text>
        <Text style={styles.companyTagline}>Your Gateway to Amazing Experiences</Text>
      </View>

      {/* Tour Title */}
      <Text style={styles.tourTitle}>Tour Quotation - {tour.name}</Text>

      {/* Trip Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Pickup Location:</Text>
          <Text style={styles.value}>{pickupLocation}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Trip Date:</Text>
          <Text style={styles.value}>{pickupDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Duration:</Text>
          <Text style={styles.value}>{tour.duration}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Distance:</Text>
          <Text style={styles.value}>{tour.distance} km</Text>
        </View>
      </View>

      {/* Tour Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tour Overview</Text>
        <Text style={styles.description}>{tour.description}</Text>
      </View>

      {/* Itinerary */}
      {tour.itinerary && tour.itinerary.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itinerary</Text>
          {tour.itinerary.map((day, index) => (
            <View key={index} style={styles.itineraryDay}>
              <Text style={styles.dayTitle}>Day {day.day}: {day.title}</Text>
              <Text style={styles.dayDescription}>{day.description}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Vehicle Options & Pricing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Options & Pricing</Text>
        <View style={styles.vehicleTable}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Vehicle Type</Text>
            <Text style={styles.tableHeaderCell}>Seating Capacity</Text>
            <Text style={styles.tableHeaderCell}>Price</Text>
          </View>
          {vehicleFares.map((vehicle, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{vehicle.vehicleType}</Text>
              <Text style={styles.tableCell}>{vehicle.seatingCapacity} Seater</Text>
              <Text style={styles.priceCell}>₹{vehicle.fare.toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Inclusions */}
      {tour.inclusions && tour.inclusions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inclusions</Text>
          {tour.inclusions.map((inclusion, index) => (
            <Text key={index} style={styles.listItem}>• {inclusion}</Text>
          ))}
        </View>
      )}

      {/* Exclusions */}
      {tour.exclusions && tour.exclusions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exclusions</Text>
          {tour.exclusions.map((exclusion, index) => (
            <Text key={index} style={styles.listItem}>• {exclusion}</Text>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.contactInfo}>
          Contact: +91 9876543210 | Email: info@vizagtours.com | Website: www.vizagtours.com
        </Text>
        <Text style={styles.contactInfo}>
          Office: 123 Beach Road, Visakhapatnam, Andhra Pradesh - 530001
        </Text>
        <Text style={styles.disclaimer}>
          * Prices are subject to availability and may vary based on season and demand. 
          Terms & conditions apply. For bookings and inquiries, please contact us.
        </Text>
      </View>
    </Page>
  </Document>
);