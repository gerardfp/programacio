import java.io.*;
import java.util.Scanner;
        
public class Main {        

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
                        String l = scanner.nextLine();

        for(int i =0 ; i<11; i++){
            System.out.print(l.charAt(i));
        }
    }
}