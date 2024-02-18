# Usage 

    let ermPage = gui.addPage( 'ERM-nonav' ) 
    ermPage.title = 'ERM Model'
    ermPage.setPageWidth( '90%' )
    ermPage.addView({ id: 'ERM', 
        rowId: 'ERM', 
        title: 'ERM',  
        height: '650px', 
        type : 'erm', 
        resourceURL: 'erm' 
      },
      {}, 'ermPage'  // no view plug-in config 
    )

# Data example

    {
      "entity": {
        "1000/device-inventory-app/1.0.0/DeviceOrder": {
          "appId": "1000/device-inventory-app/1.0.0",
          "appName": "Order Device",
          "entityId": "1000/device-inventory-app/1.0.0/DeviceOrder",
          "id": "DeviceOrder",
          "name": "IoT Device Order",
          "x": 500,
          "y": 110,
          "color": "k8s-bg-blue",
          "rel": {
            "Customer": {
              "toEntity": "1000/device-inventory-app/1.0.0/Customer",
              "mFrm": "n",
              "mTo": "1"
            },
            "Invoice": {
              "toEntity": "1000/device-inventory-app/1.0.0/Invoice",
              "mFrm": "n",
              "mTo": "1"
            },
            "Devices": {
              "toEntity": "1000/device-mgr-app/1.0.0/DeviceHardware",
              "mFrm": "n",
              "mTo": "1"
            }
          }
        },
        "1000/device-inventory-app/1.0.0/Invoice": {
          "appId": "1000/device-inventory-app/1.0.0",
          "appName": "Order Device",
          "entityId": "1000/device-inventory-app/1.0.0/Invoice",
          "id": "Invoice",
          "name": "Invoice",
          "x": 500,
          "y": 270,
          "color": "k8s-bg-blue",
          "rel": {}
        },
        "1000/device-inventory-app/1.0.0/Customer": {
          "appId": "1000/device-inventory-app/1.0.0",
          "appName": "Order Device",
          "entityId": "1000/device-inventory-app/1.0.0/Customer",
          "id": "Customer",
          "name": "Customer",
          "x": 290,
          "y": 110,
          "color": "k8s-bg-blue",
          "rel": {}
        },
        "1000/device-mgr-app/1.0.0/Device": {
          "appId": "1000/device-mgr-app/1.0.0",
          "appName": "Device Manager",
          "entityId": "1000/device-mgr-app/1.0.0/Device",
          "id": "Device",
          "name": "IoT Device",
          "x": 900,
          "y": 110,
          "color": "k8s-bg-lblue",
          "rel": {
            "Hardware": {
              "toEntity": "1000/device-mgr-app/1.0.0/DeviceHardware",
              "mFrm": "n",
              "mTo": "1"
            },
            "Tags": {
              "toEntity": "1000/device-mgr-app/1.0.0/DeviceTags",
              "mFrm": "n",
              "mTo": "m"
            }
          }
        },
        "1000/device-mgr-app/1.0.0/DeviceHardware": {
          "appId": "1000/device-mgr-app/1.0.0",
          "appName": "Device Manager",
          "entityId": "1000/device-mgr-app/1.0.0/DeviceHardware",
          "id": "DeviceHardware",
          "name": "IoT Hardware",
          "x": 700,
          "y": 110,
          "color": "k8s-bg-lblue",
          "rel": {}
        },
        "1000/device-mgr-app/1.0.0/DataLink": {
          "appId": "1000/device-mgr-app/1.0.0",
          "appName": "Device Manager",
          "entityId": "1000/device-mgr-app/1.0.0/DataLink",
          "id": "DataLink",
          "name": "IoT Data Link",
          "x": 1140,
          "y": 300,
          "color": "k8s-bg-lblue",
          "rel": {
            "DeviceTags": {
              "toEntity": "1000/device-mgr-app/1.0.0/DeviceTags",
              "mFrm": "n",
              "mTo": "m"
            }
          }
        },
        "1000/device-mgr-app/1.0.0/DeviceTags": {
          "appId": "1000/device-mgr-app/1.0.0",
          "appName": "Device Manager",
          "entityId": "1000/device-mgr-app/1.0.0/DeviceTags",
          "id": "DeviceTags",
          "name": "Device Tags",
          "x": 900,
          "y": 300,
          "color": "k8s-bg-lblue",
          "rel": {}
        },
        "1000/city-mgr-app/1.0.0/city": {
          "appId": "1000/city-mgr-app/1.0.0",
          "appName": "City Manager",
          "entityId": "1000/city-mgr-app/1.0.0/city",
          "id": "city",
          "name": "City",
          "x": 70,
          "y": 500,
          "color": "k8s-bg-gray",
          "rel": {
            "Region": {
              "toEntity": "1000/region-mgr/1.0.0/region",
              "mFrm": "n",
              "mTo": "1"
            }
          }
        },
        "1000/region-mgr/1.0.0/region": {
          "appId": "1000/region-mgr/1.0.0",
          "appName": "Region Manager",
          "entityId": "1000/region-mgr/1.0.0/region",
          "id": "region",
          "name": "Region",
          "x": 70,
          "y": 330,
          "color": "k8s-bg-tk",
          "rel": {}
        },
        "1000/city-light-mgr/1.0.0/gateway": {
          "appId": "1000/city-light-mgr/1.0.0",
          "appName": "City Light Manager",
          "entityId": "1000/city-light-mgr/1.0.0/gateway",
          "id": "gateway",
          "name": "MgrGW",
          "x": 200,
          "y": 500,
          "color": "k8s-bg-redgr",
          "rel": {}
        },
        "1000/ticket-mgr/1.0.0/Ticket": {
          "appId": "1000/ticket-mgr/1.0.0",
          "appName": "Task List",
          "entityId": "1000/ticket-mgr/1.0.0/Ticket",
          "id": "Ticket",
          "name": "Ticket\n<i>&lt;Ticket&gt;</i>",
          "x": 100,
          "y": 100,
          "color": "k8s-bg-lblue2",
          "rel": {}
        }
      }
    }