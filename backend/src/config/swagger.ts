import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Docks2Doc API',
      version: '1.0.0',
      description: 'Docks2Doc logistics management API documentation',
      contact: {
        name: 'API Support',
        email: 'support@docks2doc.com'
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication, registration, password reset, and OTP verification'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Companies',
        description: 'Company management and approval endpoints'
      },
      {
        name: 'Drivers',
        description: 'Driver management endpoints'
      },
      {
        name: 'Loads',
        description: 'Load and shipment management endpoints'
      },
      {
        name: 'Branches',
        description: 'Branch management endpoints'
      },
      {
        name: 'Equipment',
        description: 'Equipment management endpoints'
      },
      {
        name: 'Notifications',
        description: 'Notification management endpoints'
      }
    ],
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.docks2doc.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { 
              type: 'string', 
              enum: ['SUPER_ADMIN', 'CARRIER_CORP', 'CARRIER_BRANCH', 'BROKER_CORP', 'BROKER_BRANCH', 'SHIPPER_RECEIVER', 'DRIVER']
            },
            companyId: { type: 'string' },
            branchIds: { type: 'array', items: { type: 'string' } },
            permissions: { type: 'array', items: { type: 'string' } },
            lastActive: { type: 'string', format: 'date-time' },
            driver: {
              type: 'object',
              properties: {
                phone: { type: 'string' },
                photoUrl: { type: 'string' },
                status: { 
                  type: 'string', 
                  enum: ['AVAILABLE', 'ON_LOAD', 'OFF_DUTY', 'INACTIVE']
                },
                carrierId: { type: 'string' },
                addresses: { type: 'array', items: { type: 'string' } },
                phones: { type: 'array', items: { type: 'string' } },
                emergencyContacts: { 
                  type: 'array', 
                  items: { 
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      phone: { type: 'string' }
                    }
                  }
                },
                licenses: { 
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      state: { type: 'string' },
                      number: { type: 'string' },
                      class: { type: 'string' },
                      expiry: { type: 'string' }
                    }
                  }
                },
                twic: {
                  type: 'object',
                  properties: {
                    number: { type: 'string' },
                    expiry: { type: 'string' }
                  }
                },
                passport: {
                  type: 'object',
                  properties: {
                    number: { type: 'string' },
                    expiry: { type: 'string' }
                  }
                },
                endorsements: { type: 'array', items: { type: 'string' } },
                medicalCertExpiry: { type: 'string' },
                workHistory: { 
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      employer: { type: 'string' },
                      from: { type: 'string' },
                      to: { type: 'string' }
                    }
                  }
                },
                currentTractorId: { type: 'string' },
                currentTrailerId: { type: 'string' },
                currentLoadId: { type: 'string' },
                rating: { type: 'number' },
                loadsCompleted: { type: 'number' },
                lastPing: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                    at: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        },
        Company: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { 
              type: 'string', 
              enum: ['CARRIER', 'BROKER', 'SHIPPER_RECEIVER']
            },
            dotNumber: { type: 'string' },
            mcNumbers: { type: 'array', items: { type: 'string' } },
            branches: { type: 'array', items: { type: 'string' } },
            userIds: { type: 'array', items: { type: 'string' } },
            plan: { 
              type: 'string', 
              enum: ['STARTER', 'GROWTH', 'ENTERPRISE']
            },
            rating: { type: 'number' },
            mrrUsd: { type: 'number' },
            status: { 
              type: 'string', 
              enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'TRIAL', 'DECLINED']
            }
          }
        },
        Load: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: {
              type: 'string',
              enum: ['DRAFT', 'DISPATCHED', 'ASSIGNED', 'AT_PICKUP', 'LOADED', 'IN_TRANSIT', 'AT_DELIVERY', 'DELIVERED', 'INVOICED', 'PAID', 'CANCELLED']
            },
            step: { type: 'number' },
            branchId: { type: 'string' },
            shipperId: { type: 'string' },
            receiverId: { type: 'string' },
            brokerId: { type: 'string' },
            carrier: {
              type: 'object',
              properties: {
                carrierId: { type: 'string' },
                branchId: { type: 'string' },
                assignedAt: { type: 'string', format: 'date-time' }
              }
            },
            driverId: { type: 'string' },
            tractorId: { type: 'string' },
            trailerId: { type: 'string' },
            equipmentType: {
              type: 'string',
              enum: ['DRY_VAN_53', 'REEFER', 'FLATBED', 'STEP_DECK', 'CHASSIS']
            },
            milesTotal: { type: 'number' },
            milesRemaining: { type: 'number' },
            onTime: { type: 'boolean' },
            rates: {
              type: 'object',
              properties: {
                customerRateUsd: { type: 'number' },
                carrierRateUsd: { type: 'number' }
              }
            },
            pickup: {
              type: 'object',
              properties: {
                facilityName: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zip: { type: 'string' },
                windowStart: { type: 'string', format: 'date-time' },
                windowEnd: { type: 'string', format: 'date-time' }
              }
            },
            delivery: {
              type: 'object',
              properties: {
                facilityName: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zip: { type: 'string' },
                windowStart: { type: 'string', format: 'date-time' },
                windowEnd: { type: 'string', format: 'date-time' }
              }
            },
            freight: {
              type: 'object',
              properties: {
                commodity: { type: 'string' },
                pieces: { type: 'number' },
                weightLb: { type: 'number' },
                palletCount: { type: 'number' },
                hazmat: { type: 'boolean' },
                declaredValueUsd: { type: 'number' }
              }
            }
          }
        },
        Driver: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['DRIVER'] },
            companyId: { type: 'string' },
            branchIds: { type: 'array', items: { type: 'string' } },
            driver: {
              type: 'object',
              properties: {
                phone: { type: 'string' },
                status: { 
                  type: 'string', 
                  enum: ['AVAILABLE', 'ON_LOAD', 'OFF_DUTY', 'INACTIVE']
                },
                carrierId: { type: 'string' },
                rating: { type: 'number' },
                loadsCompleted: { type: 'number' },
                currentTractorId: { type: 'string' },
                currentTrailerId: { type: 'string' },
                currentLoadId: { type: 'string' }
              }
            }
          }
        },
        Branch: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            companyId: { type: 'string' },
            name: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            level: { 
              type: 'string', 
              enum: ['CORPORATE', 'SATELLITE']
            },
            managerId: { type: 'string' }
          }
        },
        Equipment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: {
              type: 'string',
              enum: ['TRACTOR', 'TRAILER', 'CONTAINER', 'CHASSIS']
            },
            unitNumber: { type: 'string' },
            make: { type: 'string' },
            model: { type: 'string' },
            year: { type: 'number' },
            vin: { type: 'string' },
            branchId: { type: 'string' },
            plates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  state: { type: 'string' },
                  number: { type: 'string' },
                  expiry: { type: 'string' }
                }
              }
            }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            loadId: { type: 'string' },
            companyId: { type: 'string' },
            userId: { type: 'string' },
            kind: {
              type: 'string',
              enum: ['ARRIVAL_5MI', 'STATUS', 'DOC', 'EXCEPTION', 'SYSTEM', 'ASSIGNMENT']
            },
            title: { type: 'string' },
            body: { type: 'string' },
            read: { type: 'boolean' },
            pinned: { type: 'boolean' },
            at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' }
          }
        },
        OTPRequest: {
          type: 'object',
          required: ['phone'],
          properties: {
            phone: { type: 'string', description: 'Phone number with country code' }
          }
        },
        OTPVerifyRequest: {
          type: 'object',
          required: ['phone', 'otp'],
          properties: {
            phone: { type: 'string' },
            otp: { type: 'string', description: '6-digit OTP' }
          }
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' }
          }
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['email', 'token', 'newPassword'],
          properties: {
            email: { type: 'string', format: 'email' },
            token: { type: 'string' },
            newPassword: { type: 'string', format: 'password', minLength: 6 }
          }
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', format: 'password' },
            newPassword: { type: 'string', format: 'password', minLength: 6 }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

const specs = swaggerJsdoc(options);

export default specs;
