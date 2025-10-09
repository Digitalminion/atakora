#!/bin/bash

# Fix private-dns-zone-arm.ts - add closing brace for validateProps and remove extra one
sed -i '120a\  }' private-dns-zone-arm.ts
sed -i '136d' private-dns-zone-arm.ts

# Fix public-ip-address-arm.ts - add closing brace for validateProps and remove extra one  
sed -i '224a\  }' public-ip-address-arm.ts
sed -i '240d' public-ip-address-arm.ts

# Fix virtual-network-link-arm.ts - add closing brace for validateProps and remove extra one
sed -i '167a\  }' virtual-network-link-arm.ts
sed -i '183d' virtual-network-link-arm.ts

# Fix waf-policy-arm.ts - add closing brace for validateProps and remove extra one
sed -i '260a\  }' waf-policy-arm.ts
sed -i '276d' waf-policy-arm.ts

echo "Fixed syntax errors"
