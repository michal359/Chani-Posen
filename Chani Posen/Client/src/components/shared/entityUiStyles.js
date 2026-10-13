export const purple = "#B68FFF";
export const purpleDark = "#A256E8";
export const purpleSoft = "#F6F0FF";
export const purpleBorder = "#D9C2FF";

export const menuPaperSx = {
    mt: 1,
    minWidth: 220,
    borderRadius: 2.5,
    overflow: "hidden",
    boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
    border: "1px solid #EEE",
    p: 0.75
};

export const menuItemSx = {
    borderRadius: 1.75,
    py: 1.2,
    px: 1.5,
    mb: 0.5,
    gap: 1,
    minHeight: 44,
    "&:hover": {
        bgcolor: purpleSoft
    }
};

export const dangerMenuItemSx = {
    ...menuItemSx,
    color: "#D32F2F",
    "&:hover": {
        bgcolor: "#FFF1F1"
    }
};

export const menuIconSx = {
    minWidth: 36,
    color: "#6B7280"
};

export const dangerMenuIconSx = {
    minWidth: 36,
    color: "#D32F2F"
};

export const menuTextProps = {
    primaryTypographyProps: {
        fontSize: 15,
        fontWeight: 500
    }
};

export const paidChipSx = {
    height: 30,
    fontWeight: 500,
    borderRadius: "999px",
    px: 0.75,
    color: "#2E7D32",
    borderColor: "#81C784",
    bgcolor: "#F7FFF7"
};

export const debtChipSx = {
    height: 30,
    fontWeight: 500,
    borderRadius: "999px",
    px: 0.75,
    color: "#D32F2F",
    borderColor: "#EF9A9A",
    bgcolor: "#FFF8F8"
};

export const specialPriceChipSx = {
    height: 28,
    fontWeight: 500,
    borderRadius: "999px",
    px: 0.75,
    color: purpleDark,
    borderColor: purple,
    bgcolor: purpleSoft
};

export const primaryButtonSx = {
    bgcolor: purple,
    color: "#fff",
    borderRadius: 1.75,
    px: 2.2,
    "&:hover": {
        bgcolor: purpleDark
    }
};

export const outlinedPurpleButtonSx = {
    color: purpleDark,
    borderColor: purpleBorder,
    borderRadius: 1.75,
    px: 2.2,
    "&:hover": {
        borderColor: purple,
        bgcolor: purpleSoft
    }
};

export const detailsDialogTitleSx = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    pb: 2,
    fontWeight: 700
};

export const detailsSectionBoxSx = {
    bgcolor: "#FCFCFD",
    border: "1px solid #F0F0F0",
    borderRadius: 2,
    p: 2.25,
    mb: 2
};

export const detailLabelSx = {
    fontSize: 13,
    color: "#8A8A8A",
    mb: 0.5
};

export const detailValueSx = {
    fontSize: 18,
    fontWeight: 500,
    color: "#2B2B2B",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere"
};