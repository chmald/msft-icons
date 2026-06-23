# NOTICE — Microsoft icon usage terms

This project provides **tooling** that converts Microsoft's official product icons
into draw.io shape libraries. It does **not** grant you any rights to the icons
themselves.

## The icons are Microsoft's

All Microsoft product icons (Azure, Microsoft Fabric,
Dynamics 365, Power Platform, Microsoft 365, Microsoft Entra, and related marks)
are trademarks and/or copyrighted assets of Microsoft Corporation. They are made
available by Microsoft under Microsoft's own terms of use, for example the Azure
architecture icon terms:

> Microsoft permits the use of these icons in architectural diagrams, training
> materials, or documentation. You may copy, distribute, and display the icons only
> for the permitted use, unless granted explicit permission by Microsoft. Microsoft
> reserves all other rights.

### You must NOT

- Crop, flip, rotate, or otherwise distort or change the shape of the icons.
- Use Microsoft product icons to represent your own (non-Microsoft) product or service.
- Use the icons in any way that implies Microsoft sponsorship or endorsement.

### You MAY

- Use the icons in architecture diagrams, presentations, training materials, and
  documentation, consistent with Microsoft's terms.

## How this affects the generator

- This repository does **not** commit the raw Microsoft SVG source files
  (`downloads/` is git-ignored). You obtain the icons directly from Microsoft.
- The generated `libraries/*.xml` files **embed** the icon artwork (base64-encoded
  SVG). Publishing/redistributing those generated libraries is a redistribution of
  Microsoft's icons and is **your responsibility** to keep within Microsoft's terms.
- The generator performs **no** shape modification — only non-distorting cleanup
  (removing XML declarations/DOCTYPE) — so the artwork is preserved as Microsoft
  shipped it.

## Official sources & terms

Download the icons directly from Microsoft and review the terms on each page:

- Azure architecture icons: <https://learn.microsoft.com/en-us/azure/architecture/icons/>
- Microsoft 365 architecture icons & templates: <https://learn.microsoft.com/en-us/previous-versions/microsoft-365/solutions/architecture-icons-templates>
- Microsoft Fabric icons: <https://learn.microsoft.com/en-us/fabric/fundamentals/icons>
- Power Platform icons: <https://learn.microsoft.com/en-us/power-platform/guidance/icons>
- Microsoft Entra architecture icons: <https://learn.microsoft.com/en-us/entra/architecture/architecture-icons>
- Dynamics 365 icons: <https://learn.microsoft.com/en-us/dynamics365/get-started/icons>
- Microsoft Trademark & Brand Guidelines: <https://www.microsoft.com/legal/intellectualproperty/trademarks>

Always review the terms on the official download pages before downloading,
generating, or distributing libraries built from these icons.
