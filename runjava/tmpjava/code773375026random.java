import java.io.*;
import java.util.Scanner;
        
public class Main {        

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        String s = scanner.next();
        for(int i=0; i<11; i++){
            System.out.print(s.charAt(i));

        }
        System.out.println("Holaaa");
    }
}