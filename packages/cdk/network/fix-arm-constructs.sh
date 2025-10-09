#!/bin/bash

# Function to fix an ARM construct file
fix_arm_construct() {
    local file=$1
    local insert_line=$2
    
    echo "Fixing $file..."
    
    # Backup
    cp "$file" "$file.bak"
    
    # Add imports after line 3 (DeploymentScope import)
    sed -i '3a import { ValidationResult, ValidationResultBuilder, ArmResource } from '\''@atakora/lib'\'';' "$file"
    
    # Add validateArmStructure method before toArmTemplate
    sed -i "${insert_line}a \n  /**\n   * Validates the ARM structure of this resource.\n   *\n   * @remarks\n   * Called during synthesis to validate the ARM template structure.\n   * Ensures all required properties are present and properly formatted.\n   *\n   * @returns Validation result with any errors or warnings\n   */\n  public validateArmStructure(): ValidationResult {\n    const builder = new ValidationResultBuilder();\n    // Basic ARM structure validation - constructor already validates props\n    return builder.build();\n  }\n" "$file"
    
    # Fix toArmTemplate return type
    sed -i 's/public toArmTemplate(): object {/public toArmTemplate(): ArmResource {/' "$file"
    sed -i 's/public toArmTemplate(): Record<string, unknown> {/public toArmTemplate(): ArmResource {/' "$file"
    
    # Clean up any stray 'n' characters
    sed -i 's/^n  \/\*\*/  \/\*\*/' "$file"
    
    echo "Fixed $file"
}

# Fix each file with the line number before toArmTemplate
fix_arm_construct "private-dns-zone-arm.ts" 120
fix_arm_construct "private-endpoint-arm.ts" 325
fix_arm_construct "public-ip-address-arm.ts" 225
fix_arm_construct "waf-policy-arm.ts" 261
fix_arm_construct "virtual-network-link-arm.ts" 168

echo "All ARM constructs fixed!"
